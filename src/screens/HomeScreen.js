import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButtons } from '../components/AuthButtons';
import { EmailAuthCard } from '../components/EmailAuthCard';
import { MapPlaceMarker } from '../components/MapPlaceMarker';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { getUserLabel, isLoggedIn } from '../lib/auth';
import { DEFAULT_REGION } from '../lib/constants';
import { distanceInKm, getCommentsForPlace, getVoteBreakdown } from '../lib/geo';
import { colors, radius, spacing, typography } from '../lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

function scheduleTimer(timerRef, callback, delay) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }

  timerRef.current = setTimeout(callback, delay);
}

export function HomeScreen({ navigation, initialMode = 'home' }) {
  const {
    state,
    authBusyProvider,
    isPasswordAuthLoading,
    errorMessage,
    signInWithOAuth,
    signInWithPassword,
    signOut,
    votePlace,
    addComment,
    trackPlaceOpen,
  } = useAppContext();
  const { region: userRegion, errorMessage: locationError } = useLiveLocation({ watch: false });
  const startsInBrowseMode = initialMode === 'browse';
  const isAuthenticated = isLoggedIn(state.session);
  const [mode, setMode] = useState(startsInBrowseMode ? 'browse' : 'home');
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [email, setEmail] = useState('testuser@topey.app');
  const [password, setPassword] = useState('TopeyTest123!');
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [areMarkersExpanded, setAreMarkersExpanded] = useState(!startsInBrowseMode);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const previewTimerRef = useRef(null);
  const homeChrome = useRef(new Animated.Value(startsInBrowseMode ? 0 : 1)).current;
  const browseChrome = useRef(new Animated.Value(startsInBrowseMode ? 1 : 0)).current;

  useEffect(() => {
    if (!state.places.length) {
      setSelectedPlaceId('');
      return;
    }

    if (!state.places.some((place) => place.id === selectedPlaceId)) {
      setSelectedPlaceId(state.places[0].id);
    }
  }, [selectedPlaceId, state.places]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(homeChrome, {
        toValue: mode === 'home' ? 1 : 0,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.spring(browseChrome, {
        toValue: mode === 'browse' ? 1 : 0,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [browseChrome, homeChrome, mode]);

  useEffect(() => {
    if (!startsInBrowseMode) {
      return;
    }

    scheduleTimer(
      previewTimerRef,
      () => {
        setAreMarkersExpanded(true);
        setIsPreviewExpanded(true);
      },
      2000
    );
  }, [startsInBrowseMode]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, []);

  const selectedPlace = useMemo(
    () => state.places.find((place) => place.id === selectedPlaceId) || state.places[0] || null,
    [selectedPlaceId, state.places]
  );
  const voteBreakdown = getVoteBreakdown(state.votes, selectedPlace?.id);
  const comments = getCommentsForPlace(state.comments, selectedPlace?.id);
  const selectedDistance = distanceInKm(userRegion, selectedPlace);
  const markersCollapsed = mode === 'browse' && (!areMarkersExpanded || isMapMoving);

  function collapseBrowseChrome() {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }

    setAreMarkersExpanded(false);
    setIsPreviewExpanded(false);
  }

  function expandBrowseChromeAfterIdle() {
    scheduleTimer(
      previewTimerRef,
      () => {
        setAreMarkersExpanded(true);
        setIsPreviewExpanded(true);
      },
      2000
    );
  }

  function enterBrowseMode() {
    if (mode !== 'browse') {
      setMode('browse');
    }

    collapseBrowseChrome();
  }

  function returnHomeMode() {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }

    setMode('home');
    setIsMapMoving(false);
    setAreMarkersExpanded(true);
    setIsPreviewExpanded(false);
    setIsDetailsModalVisible(false);
  }

  function handleBackPress() {
    if (startsInBrowseMode && navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    returnHomeMode();
  }

  function handleRegionChangeStart() {
    setIsMapMoving(true);
    enterBrowseMode();
  }

  function handleRegionChangeComplete(nextRegion) {
    setMapRegion(nextRegion);
    setIsMapMoving(false);
    expandBrowseChromeAfterIdle();
  }

  async function handleMarkerPress(placeId) {
    if (mode !== 'browse') {
      setMode('browse');
    }

    setSelectedPlaceId(placeId);
    setAreMarkersExpanded(true);
    setIsPreviewExpanded(true);

    await trackPlaceOpen({
      placeId,
      sourceScreen: startsInBrowseMode ? 'browse_map' : 'home_map',
    });
  }

  async function handleProviderPress(provider) {
    try {
      await signInWithOAuth(provider);
      setIsAuthModalVisible(false);
    } catch (error) {
      return;
    }
  }

  async function handleEmailSignIn() {
    try {
      await signInWithPassword({ email, password });
      setIsAuthModalVisible(false);
    } catch (error) {
      Alert.alert('Sign-in failed', error.message);
    }
  }

  async function handleVote(value) {
    if (!isAuthenticated || !selectedPlace) {
      setIsAuthModalVisible(true);
      return;
    }

    try {
      await votePlace({
        placeId: selectedPlace.id,
        value,
      });
    } catch (error) {
      Alert.alert('Vote failed', error.message);
    }
  }

  async function handleComment() {
    if (!isAuthenticated || !selectedPlace) {
      setIsAuthModalVisible(true);
      return;
    }

    try {
      await addComment({
        placeId: selectedPlace.id,
        body: commentDraft,
      });
      setCommentDraft('');
    } catch (error) {
      Alert.alert('Comment failed', error.message);
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={mapRegion}
        onRegionChangeStart={handleRegionChangeStart}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        testID="home-map"
      >
        {state.places.map((place) => (
          <MapPlaceMarker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            moving={markersCollapsed}
            selected={place.id === selectedPlace?.id && mode === 'browse'}
            title={place.name}
            onPress={() => handleMarkerPress(place.id)}
          />
        ))}
      </MapView>
      <View style={styles.scrim} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea} pointerEvents="box-none" testID="home-safe-area">
        <Animated.View
          pointerEvents={mode === 'home' ? 'auto' : 'none'}
          style={[
            styles.homeChrome,
            {
              opacity: homeChrome,
              transform: [{ scale: homeChrome }],
            },
          ]}
          testID="home-mode-chrome"
        >
          <View style={styles.homeTopRow}>
            <GlassBadge label="Topey" />
            <View style={styles.actionRow}>
              <ShadButton
                label={isAuthenticated ? 'Sign out' : 'Sign in'}
                size="compact"
                variant="secondary"
                onPress={() => (isAuthenticated ? signOut() : setIsAuthModalVisible(true))}
              />
              <ShadButton label="Add a place" size="compact" onPress={() => navigation.navigate('AddPlace')} />
            </View>
          </View>

          <View style={styles.homeBottomDock}>
            <Text style={styles.homeTitle}>{getUserLabel(state.session?.user)}</Text>
            <Text style={styles.homeCopy}>
              Pan the map to jump into discovery mode, or start from the Kathmandu pins below.
            </Text>
            <ShadButton
              label="Find a place"
              onPress={() => {
                setMode('browse');
                collapseBrowseChrome();
                expandBrowseChromeAfterIdle();
              }}
              style={styles.findButton}
            />
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents={mode === 'browse' ? 'auto' : 'none'}
          style={[
            styles.browseChrome,
            {
              opacity: browseChrome,
              transform: [
                {
                  scale: browseChrome.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
              ],
            },
          ]}
          testID="browse-mode-chrome"
        >
          <View style={styles.browseTopRow}>
            <ShadButton label="Back" size="compact" variant="secondary" onPress={handleBackPress} />
            <View style={styles.actionRow}>
              <ShadButton
                label={isAuthenticated ? 'Sign out' : 'Sign in'}
                size="compact"
                variant="secondary"
                onPress={() => (isAuthenticated ? signOut() : setIsAuthModalVisible(true))}
              />
              <ShadButton label="Add a place" size="compact" onPress={() => navigation.navigate('AddPlace')} />
            </View>
          </View>

          <GlassPanel style={[styles.previewCard, !isPreviewExpanded && styles.previewCardCollapsed]}>
            {selectedPlace ? (
              <>
                <Text style={styles.previewEyebrow}>Find a place</Text>
                <Text numberOfLines={1} style={styles.previewTitle}>
                  {selectedPlace.name}
                </Text>
                {isPreviewExpanded ? (
                  <>
                    <Text numberOfLines={2} style={styles.previewCopy}>
                      {selectedPlace.description}
                    </Text>
                    <View style={styles.previewStats}>
                      <PreviewStat
                        label="Distance"
                        value={selectedDistance ? `${selectedDistance.toFixed(1)} km` : 'Locating'}
                      />
                      <PreviewStat label="Votes" value={voteBreakdown.ratioLabel} />
                      <PreviewStat label="Comments" value={`${comments.length}`} />
                    </View>
                    <View style={styles.previewActions}>
                      <ShadButton
                        label={isAuthenticated ? 'Open details' : 'Sign in to open'}
                        size="compact"
                        onPress={() => (isAuthenticated ? setIsDetailsModalVisible(true) : setIsAuthModalVisible(true))}
                        style={styles.previewActionButton}
                      />
                    </View>
                  </>
                ) : null}
              </>
            ) : (
              <Text style={styles.previewCopy}>Pan around Kathmandu to find the demo places.</Text>
            )}
          </GlassPanel>
        </Animated.View>
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent
        visible={isAuthModalVisible}
        onRequestClose={() => setIsAuthModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setIsAuthModalVisible(false)} />
          <GlassPanel style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Topey account</Text>
            <Text style={styles.modalCopy}>
              Use the lightweight sign-in flow here instead of keeping a full homepage widget open.
            </Text>
            <AuthButtons busyProvider={authBusyProvider} onProviderPress={handleProviderPress} />
            <EmailAuthCard
              email={email}
              password={password}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSignIn={handleEmailSignIn}
              authBusy={isPasswordAuthLoading}
              helperText="Seeded test credentials: testuser@topey.app / TopeyTest123!"
            />
            {errorMessage ? <Text style={styles.meta}>{errorMessage}</Text> : null}
            {locationError ? <Text style={styles.meta}>{locationError}</Text> : null}
          </GlassPanel>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={isDetailsModalVisible}
        onRequestClose={() => setIsDetailsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setIsDetailsModalVisible(false)} />
          <GlassPanel style={styles.detailsSheet}>
            {selectedPlace ? (
              <>
                <Text style={styles.modalTitle}>{selectedPlace.name}</Text>
                <Text style={styles.modalCopy}>{selectedPlace.description}</Text>

                <View style={styles.detailStats}>
                  <PreviewStat
                    label="Distance"
                    value={selectedDistance ? `${selectedDistance.toFixed(1)} km` : 'Locating'}
                  />
                  <PreviewStat
                    label="Votes"
                    value={`${voteBreakdown.ratioLabel} (${voteBreakdown.score >= 0 ? '+' : ''}${voteBreakdown.score})`}
                  />
                  <PreviewStat label="Comments" value={`${comments.length}`} />
                </View>

                <View style={styles.voteRow}>
                  <ShadButton label="Upvote" size="compact" onPress={() => handleVote(1)} style={styles.voteButton} />
                  <ShadButton
                    label="Downvote"
                    size="compact"
                    variant="secondary"
                    onPress={() => handleVote(-1)}
                    style={styles.voteButton}
                  />
                </View>

                {isAuthenticated ? (
                  <>
                    <View style={styles.commentComposer}>
                      <TextInput
                        placeholder="Add a comment"
                        placeholderTextColor={colors.mutedText}
                        value={commentDraft}
                        onChangeText={setCommentDraft}
                        style={styles.input}
                      />
                      <ShadButton label="Send" size="compact" onPress={handleComment} />
                    </View>
                    <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
                      {comments.map((comment) => (
                        <GlassPanel key={comment.id} style={styles.commentCard}>
                          <Text style={styles.commentAuthor}>{comment.authorName || 'Topey user'}</Text>
                          <Text style={styles.commentBody}>{comment.body}</Text>
                        </GlassPanel>
                      ))}
                      {comments.length === 0 ? <Text style={styles.meta}>No comments yet.</Text> : null}
                    </ScrollView>
                  </>
                ) : (
                  <GlassPanel style={styles.lockedCard}>
                    <Text style={styles.lockedTitle}>Sign in to comment and vote.</Text>
                    <Text style={styles.lockedCopy}>
                      We now track place opens so later we can notify users about updates around places they care about.
                    </Text>
                    <ShadButton label="Sign in" size="compact" onPress={() => setIsAuthModalVisible(true)} />
                  </GlassPanel>
                )}
              </>
            ) : null}
          </GlassPanel>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function GlassPanel({ children, style }) {
  return <View style={[styles.glassPanel, style]}>{children}</View>;
}

function GlassBadge({ label }) {
  return (
    <GlassPanel style={styles.glassBadge}>
      <Text style={styles.badgeLabel}>{label}</Text>
    </GlassPanel>
  );
}

function PreviewStat({ label, value }) {
  return (
    <View style={styles.previewStat}>
      <Text style={styles.previewStatLabel}>{label}</Text>
      <Text style={styles.previewStatValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 9, 18, 0.18)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  homeChrome: {
    flex: 1,
    justifyContent: 'space-between',
  },
  browseChrome: {
    flex: 1,
    justifyContent: 'space-between',
  },
  homeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  browseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  homeBottomDock: {
    alignSelf: 'stretch',
  },
  homeTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 28,
  },
  homeCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  findButton: {
    marginTop: spacing.lg,
    minHeight: 60,
  },
  previewCard: {
    alignSelf: 'stretch',
  },
  previewCardCollapsed: {
    minHeight: 0,
    paddingVertical: spacing.sm,
  },
  previewEyebrow: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  previewTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 20,
    marginTop: spacing.xs,
  },
  previewCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  previewStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  previewStat: {
    flex: 1,
  },
  previewStatLabel: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 11,
  },
  previewStatValue: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  previewActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
  },
  previewActionButton: {
    flex: 1,
  },
  glassPanel: {
    backgroundColor: 'rgba(12, 18, 30, 0.58)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 6,
  },
  glassBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badgeLabel: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 6, 12, 0.56)',
  },
  modalSheet: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  detailsSheet: {
    maxHeight: '78%',
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 26,
  },
  modalCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  meta: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  detailStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  voteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  voteButton: {
    flex: 1,
  },
  commentComposer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontFamily: typography.body,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  commentsList: {
    marginTop: spacing.md,
  },
  commentCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  commentAuthor: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  commentBody: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  lockedCard: {
    marginTop: spacing.md,
  },
  lockedTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  lockedCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
