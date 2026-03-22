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
import { isLoggedIn } from '../lib/auth';
import { DEFAULT_REGION } from '../lib/constants';
import { distanceInKm, getCommentsForPlace, getNearestPlace, getVoteBreakdown } from '../lib/geo';
import { colors, radius, spacing, typography } from '../lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

function scheduleTimer(timerRef, callback, delay) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }

  timerRef.current = setTimeout(callback, delay);
}

function buildPlaceRegion(place, region) {
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    latitudeDelta: region?.latitudeDelta ?? DEFAULT_REGION.latitudeDelta,
    longitudeDelta: region?.longitudeDelta ?? DEFAULT_REGION.longitudeDelta,
  };
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
  const {
    region: userRegion,
    errorMessage: locationError,
    hasResolvedInitialRegion,
  } = useLiveLocation({ watch: false });
  const startsInBrowseMode = initialMode === 'browse';
  const isAuthenticated = isLoggedIn(state.session);
  const mapRef = useRef(null);
  const previewTimerRef = useRef(null);
  const homeChrome = useRef(new Animated.Value(startsInBrowseMode ? 0 : 1)).current;
  const browseChrome = useRef(new Animated.Value(startsInBrowseMode ? 1 : 0)).current;
  const previewChrome = useRef(new Animated.Value(startsInBrowseMode ? 0.56 : 0)).current;
  const [mapKey, setMapKey] = useState(0);
  const [hasCenteredMap, setHasCenteredMap] = useState(false);
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

  const selectedPlace = useMemo(
    () => state.places.find((place) => place.id === selectedPlaceId) || state.places[0] || null,
    [selectedPlaceId, state.places]
  );
  const voteBreakdown = getVoteBreakdown(state.votes, selectedPlace?.id);
  const comments = getCommentsForPlace(state.comments, selectedPlace?.id);
  const selectedDistance = distanceInKm(userRegion, selectedPlace);
  const markersCollapsed = mode === 'browse' && (!areMarkersExpanded || isMapMoving);

  useEffect(() => {
    if (!state.places.length) {
      setSelectedPlaceId('');
      return;
    }

    if (!selectedPlaceId) {
      const nearestPlace = getNearestPlace(state.places, mapRegion) || state.places[0];
      setSelectedPlaceId(nearestPlace.id);
      return;
    }

    if (!state.places.some((place) => place.id === selectedPlaceId)) {
      setSelectedPlaceId(state.places[0].id);
    }
  }, [mapRegion, selectedPlaceId, state.places]);

  useEffect(() => {
    if (!hasCenteredMap && hasResolvedInitialRegion) {
      setMapRegion(userRegion);
      setHasCenteredMap(true);
      setMapKey((value) => value + 1);

      const nearestPlace = getNearestPlace(state.places, userRegion);

      if (nearestPlace) {
        setSelectedPlaceId(nearestPlace.id);
      }
    }
  }, [hasCenteredMap, hasResolvedInitialRegion, state.places, userRegion]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(homeChrome, {
        toValue: mode === 'home' ? 1 : 0,
        friction: 9,
        tension: 130,
        useNativeDriver: true,
      }),
      Animated.spring(browseChrome, {
        toValue: mode === 'browse' ? 1 : 0,
        friction: 9,
        tension: 130,
        useNativeDriver: true,
      }),
    ]).start();
  }, [browseChrome, homeChrome, mode]);

  useEffect(() => {
    Animated.spring(previewChrome, {
      toValue: mode !== 'browse' ? 0 : isPreviewExpanded ? 1 : 0.58,
      friction: 9,
      tension: 125,
      useNativeDriver: true,
    }).start();
  }, [isPreviewExpanded, mode, previewChrome]);

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

  function selectNearestPlace(region) {
    const nearestPlace = getNearestPlace(state.places, region);

    if (nearestPlace) {
      setSelectedPlaceId(nearestPlace.id);
    }
  }

  function enterBrowseMode() {
    if (mode !== 'browse') {
      setMode('browse');
    }

    collapseBrowseChrome();
    selectNearestPlace(mapRegion);
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

  function handleFindPlacePress() {
    enterBrowseMode();
    expandBrowseChromeAfterIdle();
  }

  function handleRegionChangeStart() {
    setIsMapMoving(true);
    enterBrowseMode();
  }

  function handleRegionChangeComplete(nextRegion) {
    setMapRegion(nextRegion);
    setIsMapMoving(false);
    selectNearestPlace(nextRegion);
    expandBrowseChromeAfterIdle();
  }

  async function handleMarkerPress(placeId) {
    const place = state.places.find((entry) => entry.id === placeId);

    if (!place) {
      return;
    }

    setMode('browse');
    setSelectedPlaceId(placeId);
    setAreMarkersExpanded(true);
    setIsPreviewExpanded(true);

    mapRef.current?.animateToRegion?.(buildPlaceRegion(place, mapRegion), 320);
  }

  async function handleOpenDetails() {
    if (!selectedPlace) {
      return;
    }

    await trackPlaceOpen({
      placeId: selectedPlace.id,
      sourceScreen: startsInBrowseMode ? 'browse_details' : mode === 'browse' ? 'home_browse_details' : 'home_details',
    });

    setIsDetailsModalVisible(true);
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

  const homeChromeStyle = {
    opacity: homeChrome,
    transform: [
      {
        translateY: homeChrome.interpolate({
          inputRange: [0, 1],
          outputRange: [-18, 0],
        }),
      },
      {
        scale: homeChrome.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
        }),
      },
    ],
  };

  const browseChromeStyle = {
    opacity: browseChrome,
    transform: [
      {
        translateY: browseChrome.interpolate({
          inputRange: [0, 1],
          outputRange: [-14, 0],
        }),
      },
      {
        scale: browseChrome.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1],
        }),
      },
    ],
  };

  const previewStyle = {
    opacity: previewChrome,
    transform: [
      {
        translateY: previewChrome.interpolate({
          inputRange: [0, 1],
          outputRange: [52, 0],
        }),
      },
      {
        scale: previewChrome.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <MapView
        key={`home-map-${mapKey}`}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={mapRegion}
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

      <SafeAreaView style={styles.overlayRoot} pointerEvents="box-none" testID="home-safe-area">
        <View style={styles.topOverlay} pointerEvents="box-none">
          <Animated.View
            pointerEvents={mode === 'home' ? 'box-none' : 'none'}
            style={[styles.topRow, homeChromeStyle]}
            testID="home-mode-chrome"
          >
            <Pressable onPress={handleFindPlacePress} style={styles.searchPressable} testID="home-search-chip">
              <GlassPanel style={styles.searchCapsule}>
                <Text style={styles.searchEyebrow}>Explore</Text>
                <Text style={styles.searchLabel}>Find a place</Text>
              </GlassPanel>
            </Pressable>

            <View style={styles.topActionCluster}>
              <ShadButton
                label={isAuthenticated ? 'Sign out' : 'Sign in'}
                size="compact"
                shape="pill"
                variant="secondary"
                onPress={() => (isAuthenticated ? signOut() : setIsAuthModalVisible(true))}
              />
              <ShadButton
                label="Add"
                size="compact"
                shape="pill"
                onPress={() => navigation.navigate('AddPlace')}
              />
            </View>
          </Animated.View>

          <Animated.View
            pointerEvents={mode === 'browse' ? 'box-none' : 'none'}
            style={[styles.topRow, browseChromeStyle]}
            testID="browse-mode-chrome"
          >
            <View style={styles.browseLeadingCluster}>
              <ShadButton
                label="Back"
                size="compact"
                shape="pill"
                variant="secondary"
                onPress={handleBackPress}
                testID="browse-back-button"
              />
              <GlassPanel style={styles.modePill}>
                <Text style={styles.modePillLabel}>Find a place</Text>
              </GlassPanel>
            </View>

            <View style={styles.topActionCluster}>
              <ShadButton
                label={isAuthenticated ? 'Sign out' : 'Sign in'}
                size="compact"
                shape="pill"
                variant="secondary"
                onPress={() => (isAuthenticated ? signOut() : setIsAuthModalVisible(true))}
              />
              <ShadButton
                label="Add"
                size="compact"
                shape="pill"
                onPress={() => navigation.navigate('AddPlace')}
              />
            </View>
          </Animated.View>
        </View>

        <View style={styles.bottomOverlay} pointerEvents="box-none">
          <Animated.View
            pointerEvents="none"
            style={[styles.homeHintWrap, homeChromeStyle]}
            testID="home-hint-card"
          >
            <GlassPanel style={styles.homeHintPanel}>
              <Text style={styles.homeHintTitle}>Kathmandu pins ready</Text>
              <Text style={styles.homeHintCopy}>
                Drag anywhere on the map to enter browse mode. Only the map center decides which place preview opens.
              </Text>
            </GlassPanel>
          </Animated.View>

          <Animated.View
            pointerEvents={mode === 'browse' ? 'box-none' : 'none'}
            style={[styles.previewDock, previewStyle]}
          >
            <GlassPanel
              style={[styles.previewCard, !isPreviewExpanded && styles.previewCardCollapsed]}
              testID="place-preview-card"
            >
              {selectedPlace ? (
                <>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewEyebrow}>Find a place</Text>
                    <Text style={styles.previewDistance}>
                      {selectedDistance ? `${selectedDistance.toFixed(1)} km` : 'Locating'}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={styles.previewTitle}>
                    {selectedPlace.name}
                  </Text>

                  {isPreviewExpanded ? (
                    <>
                      <Text numberOfLines={2} style={styles.previewCopy}>
                        {selectedPlace.description}
                      </Text>
                      <View style={styles.previewStats}>
                        <PreviewStat label="Votes" value={voteBreakdown.ratioLabel} />
                        <PreviewStat label="Comments" value={`${comments.length}`} />
                        <PreviewStat label="Source" value={selectedPlace.authorName ? 'Community' : 'Demo'} />
                      </View>
                      <ShadButton
                        label="Open details"
                        size="compact"
                        shape="pill"
                        onPress={handleOpenDetails}
                        style={styles.previewActionButton}
                      />
                    </>
                  ) : (
                    <Text numberOfLines={1} style={styles.previewMiniCopy}>
                      {isMapMoving ? 'Moving map...' : 'Hold still for details'}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.previewEyebrow}>Find a place</Text>
                  <Text style={styles.previewTitle}>No places yet</Text>
                  <Text style={styles.previewMiniCopy}>Add a place to seed the map.</Text>
                </>
              )}
            </GlassPanel>
          </Animated.View>

          {locationError ? (
            <View pointerEvents="none" style={styles.locationStatusWrap}>
              <GlassPanel style={styles.locationStatusPill}>
                <Text style={styles.locationStatusText}>{locationError}</Text>
              </GlassPanel>
            </View>
          ) : null}
        </View>
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
              Sign in from the edge controls without covering the map with a permanent homepage card.
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
                  <ShadButton
                    label="Upvote"
                    size="compact"
                    shape="pill"
                    onPress={() => handleVote(1)}
                    style={styles.voteButton}
                  />
                  <ShadButton
                    label="Downvote"
                    size="compact"
                    shape="pill"
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
                      <ShadButton label="Send" size="compact" shape="pill" onPress={handleComment} />
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
                      Place detail opens are tracked now so area notifications can build on real interest later.
                    </Text>
                    <ShadButton
                      label="Sign in"
                      size="compact"
                      shape="pill"
                      onPress={() => setIsAuthModalVisible(true)}
                    />
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

function GlassPanel({ children, style, testID, pointerEvents }) {
  return (
    <View pointerEvents={pointerEvents} style={[styles.glassPanel, style]} testID={testID}>
      <View pointerEvents="none" style={styles.glassSheen} />
      <View pointerEvents="none" style={styles.glassShadow} />
      {children}
    </View>
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
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchPressable: {
    flexShrink: 1,
    maxWidth: '58%',
  },
  searchCapsule: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchEyebrow: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  searchLabel: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 18,
    marginTop: spacing.xxs,
  },
  browseLeadingCluster: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  topActionCluster: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  modePill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modePillLabel: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  bottomOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  homeHintWrap: {
    alignSelf: 'stretch',
    marginBottom: spacing.sm,
  },
  homeHintPanel: {
    maxWidth: 320,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  homeHintTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 18,
  },
  homeHintCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  previewDock: {
    alignSelf: 'stretch',
    marginTop: 'auto',
  },
  previewCard: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  previewCardCollapsed: {
    paddingVertical: spacing.sm,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewEyebrow: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  previewDistance: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  previewTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 24,
    marginTop: spacing.xs,
  },
  previewCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  previewMiniCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 13,
    marginTop: spacing.xs,
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
    marginTop: spacing.xxs,
  },
  previewActionButton: {
    marginTop: spacing.md,
  },
  locationStatusWrap: {
    marginTop: spacing.sm,
  },
  locationStatusPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locationStatusText: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 12,
    maxWidth: 320,
  },
  glassPanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
  glassSheen: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.lg,
    height: '46%',
    left: 1,
    position: 'absolute',
    right: 1,
    top: 1,
  },
  glassShadow: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.lg,
    bottom: 1,
    left: 1,
    position: 'absolute',
    right: 1,
    top: '52%',
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
    marginBottom: spacing.lg,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  detailsSheet: {
    marginBottom: spacing.lg,
    marginHorizontal: spacing.md,
    maxHeight: '78%',
    padding: spacing.md,
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
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
    padding: spacing.md,
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
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
});
