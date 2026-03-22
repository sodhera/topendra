import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { CompactVoteControls } from '../components/CompactVoteControls';
import { EmailAuthCard } from '../components/EmailAuthCard';
import { MapPlaceMarker } from '../components/MapPlaceMarker';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { isLoggedIn } from '../lib/auth';
import { DEFAULT_REGION, KATHMANDU_EXPLORE_REGION } from '../lib/constants';
import { getCommentsForPlace, getVoteBreakdown } from '../lib/geo';
import { openPlaceInMaps } from '../lib/locationLinks';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';

function buildPlaceRegion(place) {
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    latitudeDelta: DEFAULT_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_REGION.longitudeDelta,
  };
}

export function BrowseScreen({ navigation, route }) {
  const {
    state,
    authBusyProvider,
    isPasswordAuthLoading,
    errorMessage,
    signInWithOAuth,
    signInWithPassword,
    addComment,
    votePlace,
    trackPlaceOpen,
  } = useAppContext();
  const mapRef = useRef(null);
  const initialPlaceId = route?.params?.placeId ?? '';
  const isAuthenticated = isLoggedIn(state.session);
  const [selectedPlaceId, setSelectedPlaceId] = useState(initialPlaceId);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [email, setEmail] = useState('testuser@topey.app');
  const [password, setPassword] = useState('TopeyTest123!');

  const selectedPlace = useMemo(
    () => state.places.find((place) => place.id === selectedPlaceId) || null,
    [selectedPlaceId, state.places]
  );
  const voteBreakdown = getVoteBreakdown(state.votes, selectedPlace?.id);
  const comments = getCommentsForPlace(state.comments, selectedPlace?.id);
  const threadCount = selectedPlace?.threadCount ?? comments.length;
  const currentVote = useMemo(() => {
    if (!selectedPlace || !state.session?.user?.id) {
      return 0;
    }

    return state.votes.find(
      (vote) => vote.placeId === selectedPlace.id && vote.userId === state.session.user.id
    )?.value ?? 0;
  }, [selectedPlace, state.session?.user?.id, state.votes]);

  useEffect(() => {
    if (!initialPlaceId) {
      return;
    }

    const nextPlace = state.places.find((place) => place.id === initialPlaceId);

    if (!nextPlace) {
      return;
    }

    setSelectedPlaceId(nextPlace.id);
    mapRef.current?.animateToRegion?.(buildPlaceRegion(nextPlace), 220);
  }, [initialPlaceId, state.places]);

  function handleMarkerPress(placeId) {
    const place = state.places.find((entry) => entry.id === placeId);

    if (!place) {
      return;
    }

    setSelectedPlaceId(place.id);
    mapRef.current?.animateToRegion?.(buildPlaceRegion(place), 220);
    trackPlaceOpen({
      placeId: place.id,
      sourceScreen: 'browse_preview',
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
      setIsDetailsModalVisible(false);
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

  async function handleOpenLocation() {
    if (!selectedPlace) {
      return;
    }

    try {
      await openPlaceInMaps(selectedPlace);
    } catch (error) {
      Alert.alert('Unable to open location', 'Could not open this place in maps.');
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        initialRegion={KATHMANDU_EXPLORE_REGION}
        onPress={() => setSelectedPlaceId('')}
        style={StyleSheet.absoluteFill}
        testID="browse-map"
      >
        {state.places.map((place) => (
          <MapPlaceMarker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            selected={place.id === selectedPlaceId}
            onPress={() => handleMarkerPress(place.id)}
          />
        ))}
      </MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.overlayRoot}>
        <View pointerEvents="box-none" style={styles.topRow}>
          <ShadButton
            label="Back"
            size="compact"
            shape="pill"
            variant="secondary"
            onPress={() => navigation.goBack()}
            testID="browse-back-button"
          />
          <ShadButton
            label="Add a place"
            size="compact"
            shape="pill"
            variant="secondary"
            onPress={() => navigation.navigate('AddPlace')}
            testID="browse-add-button"
          />
        </View>

        <View pointerEvents="box-none" style={styles.bottomDock}>
          {selectedPlace ? (
            <View style={styles.previewCard} testID="browse-preview-card">
              <Text style={styles.previewTitle}>{selectedPlace.name}</Text>
              <Text numberOfLines={2} style={styles.previewCopy}>
                {selectedPlace.description}
              </Text>
              <View style={styles.previewStats}>
                <PreviewStat label="Rating" value={`${voteBreakdown.score >= 0 ? '+' : ''}${voteBreakdown.score}`} />
                <PreviewStat label="Votes" value={voteBreakdown.ratioLabel} />
                <PreviewStat label="Threads" value={`${threadCount}`} />
              </View>
              <ShadButton
                label="View more"
                size="compact"
                shape="pill"
                onPress={() => setIsDetailsModalVisible(true)}
                style={styles.previewButton}
              />
            </View>
          ) : null}
        </View>
      </SafeAreaView>

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
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {selectedPlace ? (
              <>
                <Text style={styles.sheetTitle}>{selectedPlace.name}</Text>
                <Text style={styles.sheetCopy}>{selectedPlace.description}</Text>

                <View style={styles.detailStats}>
                  <PreviewStat
                    label="Rating"
                    value={`${voteBreakdown.score >= 0 ? '+' : ''}${voteBreakdown.score}`}
                  />
                  <PreviewStat label="Votes" value={voteBreakdown.ratioLabel} />
                  <PreviewStat label="Threads" value={`${threadCount}`} />
                </View>

                <View style={styles.actionRow}>
                  <ShadButton
                    label="Open location"
                    size="default"
                    shape="pill"
                    onPress={handleOpenLocation}
                    style={styles.locationButton}
                    labelStyle={styles.locationButtonLabel}
                    testID="browse-open-location-button"
                  />

                  <CompactVoteControls
                    currentVote={currentVote}
                    onDownvote={() => handleVote(-1)}
                    onUpvote={() => handleVote(1)}
                    score={voteBreakdown.score}
                    style={styles.voteControls}
                    testIDPrefix="browse-vote"
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
                      <ShadButton
                        label="Send"
                        size="compact"
                        shape="pill"
                        onPress={handleComment}
                        style={styles.sendButton}
                        labelStyle={styles.sendButtonLabel}
                      />
                    </View>

                    <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
                      {comments.map((comment) => (
                        <View key={comment.id} style={styles.commentCard}>
                          <Text style={styles.commentAuthor}>{comment.authorName || 'Topey user'}</Text>
                          <Text style={styles.commentBody}>{comment.body}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </>
                ) : (
                  <View style={styles.lockedCard}>
                    <Text style={styles.lockedTitle}>Log in to read threads.</Text>
                    <Text style={styles.lockedCopy}>
                      View more opens the conversation only for signed-in users right now.
                    </Text>
                    <ShadButton
                      label="Log in"
                      size="compact"
                      shape="pill"
                      onPress={() => {
                        setIsDetailsModalVisible(false);
                        setIsAuthModalVisible(true);
                      }}
                    />
                  </View>
                )}
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sign in</Text>
            <Text style={styles.sheetCopy}>
              Sign in to see the place threads, vote, and post comments.
            </Text>
            <AuthButtons busyProvider={authBusyProvider} onProviderPress={handleProviderPress} />
            <EmailAuthCard
              email={email}
              password={password}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSignIn={handleEmailSignIn}
              authBusy={isPasswordAuthLoading}
              helperText="Test account: testuser@topey.app / TopeyTest123!"
            />
            {errorMessage ? <Text style={styles.sheetMeta}>{errorMessage}</Text> : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomDock: {
    paddingBottom: spacing.sm,
  },
  previewCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 0.75,
    padding: spacing.lg,
    ...shadows.floating,
  },
  previewTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  previewCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  previewStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  previewStat: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 0.75,
    padding: spacing.sm,
  },
  previewStatLabel: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  previewStatValue: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.18,
    marginTop: spacing.xxs,
  },
  previewButton: {
    marginTop: spacing.md,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.sheetBackdrop,
  },
  sheet: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 0.75,
    borderBottomWidth: 0,
    maxHeight: '80%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    ...shadows.floating,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.handle,
    borderRadius: radius.pill,
    height: 5,
    marginBottom: spacing.md,
    width: 38,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  sheetCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  sheetMeta: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  detailStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  locationButton: {
    flex: 1,
    minHeight: 50,
  },
  locationButtonLabel: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  voteControls: {
    marginTop: 0,
  },
  commentComposer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 14,
  },
  input: {
    backgroundColor: colors.elevatedCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 0.75,
    color: colors.text,
    flex: 1,
    fontFamily: typography.body,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sendButton: {
    minHeight: 40,
    minWidth: 78,
    paddingHorizontal: 16,
  },
  sendButtonLabel: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  commentsList: {
    marginTop: spacing.md,
  },
  commentCard: {
    backgroundColor: colors.elevatedCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 0.75,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  commentAuthor: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.16,
  },
  commentBody: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  lockedCard: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 0.75,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  lockedTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.18,
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
