import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompactVoteControls } from '../components/CompactVoteControls';
import { EmailAuthCard } from '../components/EmailAuthCard';
import { MapPlaceMarker } from '../components/MapPlaceMarker';
import { PlaceConversationSection } from '../components/PlaceConversationSection';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { getUserIdentity, isLoggedIn } from '@topey/shared/lib/auth';
import { KATHMANDU_EXPLORE_REGION } from '@topey/shared/lib/constants';
import { getCommentsForPlace, getVoteBreakdown } from '@topey/shared/lib/geo';
import { CLEAN_MOBILE_MAP_PROPS } from '@topey/shared/lib/mobileMap';
import { openPlaceInMaps } from '../lib/locationLinks';
import { colors, radius, spacing, typography } from '@topey/shared/lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

export function HomeScreen({ navigation }) {
  const {
    state,
    isEmailAuthLoading,
    authNoticeMessage,
    errorMessage,
    signUpWithPassword,
    signInWithPassword,
    signInWithGoogle,
    signInWithApple,
    signOut,
    addComment,
    votePlace,
    trackPlaceOpen,
    isAuthModalVisible,
    setIsAuthModalVisible,
  } = useAppContext();
  const currentUser = getUserIdentity(state.session?.user);
  const isAuthenticated = isLoggedIn(state.session);
  const { region: userRegion, hasResolvedInitialRegion } = useLiveLocation({ watch: false });
  const [mapKey, setMapKey] = useState(0);
  const [mapRegion, setMapRegion] = useState(KATHMANDU_EXPLORE_REGION);
  const [hasCenteredMap, setHasCenteredMap] = useState(false);
  const [isPlaceModalVisible, setIsPlaceModalVisible] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');

  useEffect(() => {
    if (!hasCenteredMap && hasResolvedInitialRegion) {
      setMapRegion(userRegion);
      setHasCenteredMap(true);
      setMapKey((value) => value + 1);
    }
  }, [hasCenteredMap, hasResolvedInitialRegion, userRegion]);

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

  async function handleSignUp({ email, username, password }) {
    try {
      await signUpWithPassword({ email, username, password });
      setIsAuthModalVisible(false);
    } catch (error) {
      Alert.alert('Sign-up failed', error.message);
    }
  }

  async function handleSignIn({ email, password }) {
    try {
      await signInWithPassword({ email, password });
      setIsAuthModalVisible(false);
    } catch (error) {
      Alert.alert('Sign-in failed', error.message);
    }
  }

  async function handleGoogleSignIn() {
    try {
      await signInWithGoogle();
      setIsAuthModalVisible(false);
    } catch (error) {
      Alert.alert('Google Sign-in failed', error.message);
    }
  }

  async function handleAppleSignIn() {
    try {
      await signInWithApple();
      setIsAuthModalVisible(false);
    } catch (error) {
      Alert.alert('Apple Sign-in failed', error.message);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setIsAuthModalVisible(false);
    } catch (error) {
      Alert.alert('Sign-out failed', error.message);
    }
  }

  function handleMarkerPress(placeId) {
    const place = state.places.find((entry) => entry.id === placeId);

    if (!place) {
      return;
    }

    setSelectedPlaceId(place.id);
    setIsPlaceModalVisible(true);
    trackPlaceOpen({
      placeId: place.id,
      sourceScreen: 'home_pin_modal',
    });
  }

  async function handleVote(value) {
    if (!isAuthenticated || !selectedPlace) {
      setIsPlaceModalVisible(false);
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

  async function handleComment({ body }) {
    if (!isAuthenticated || !selectedPlace) {
      setIsPlaceModalVisible(false);
      setIsAuthModalVisible(true);
      return;
    }

    try {
      await addComment({
        placeId: selectedPlace.id,
        body,
      });
    } catch (error) {
      Alert.alert('Comment failed', error.message);
    }
  }

  function openAccountFromPlace() {
    setIsPlaceModalVisible(false);
    setIsAuthModalVisible(true);
  }

  function closePlaceModal() {
    setIsPlaceModalVisible(false);
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
        {...CLEAN_MOBILE_MAP_PROPS}
        key={`home-map-${mapKey}`}
        initialRegion={mapRegion}
        showsUserLocation
        style={StyleSheet.absoluteFill}
        testID="home-map"
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
            label={isAuthenticated ? 'Profile' : 'Sign in'}
            size="compact"
            shape="pill"
            variant="secondary"
            onPress={() => setIsAuthModalVisible(true)}
            testID="home-account-button"
          />
        </View>

        <View pointerEvents="box-none" style={styles.bottomDock}>
          <ShadButton
            label="+"
            size="large"
            shape="rounded"
            onPress={() => navigation.navigate('AddPlace')}
            style={styles.addButton}
            labelStyle={styles.addButtonLabel}
            testID="home-plus-button"
          />
        </View>
      </SafeAreaView>

      <Modal
        animationType="fade"
        transparent
        visible={isPlaceModalVisible}
        onRequestClose={closePlaceModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={closePlaceModal} />
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
                    align="left"
                  />
                  <PreviewStat label="Votes" value={voteBreakdown.ratioLabel} align="center" />
                  <PreviewStat label="Threads" value={`${threadCount}`} align="right" />
                </View>

                <ShadButton
                  label="Open location"
                  size="default"
                  shape="pill"
                  onPress={handleOpenLocation}
                  style={styles.locationButton}
                  labelStyle={styles.locationButtonLabel}
                  testID="home-open-location-button"
                />

                <View style={styles.participationRow}>
                  <CompactVoteControls
                    currentVote={currentVote}
                    onDownvote={() => handleVote(-1)}
                    onUpvote={() => handleVote(1)}
                    score={voteBreakdown.score}
                    style={styles.voteControls}
                    testIDPrefix="home-vote"
                  />
                  <Text style={styles.addedByLabel} testID="home-added-by-label">
                    Added by: <Text style={styles.addedByValue}>{selectedPlace.authorName || 'Topey user'}</Text>
                  </Text>
                </View>

                <PlaceConversationSection
                  comments={comments}
                  isAuthenticated={isAuthenticated}
                  onAddComment={handleComment}
                  onRequireAuth={openAccountFromPlace}
                  placeName={selectedPlace.name}
                  testIDPrefix="home"
                />
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              {isAuthenticated ? (
                <>
                  <Text style={styles.sheetTitle}>Profile</Text>
                  <Text style={styles.profileName}>{currentUser.name}</Text>
                  {currentUser.email ? <Text style={styles.profileMeta}>{currentUser.email}</Text> : null}
                  <ShadButton
                    label="Sign out"
                    shape="pill"
                    onPress={handleSignOut}
                    style={styles.sheetButton}
                  />
                </>
              ) : (
                <>
                  <EmailAuthCard
                    onSignUp={handleSignUp}
                    onSignIn={handleSignIn}
                    onGoogleSignIn={handleGoogleSignIn}
                    onAppleSignIn={handleAppleSignIn}
                    authBusy={isEmailAuthLoading}
                    helperText={authNoticeMessage}
                  />
                  {errorMessage ? <Text style={styles.sheetMeta}>{errorMessage}</Text> : null}
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function PreviewStat({ align, label, value }) {
  return (
    <View
      style={[
        styles.previewStat,
        align === 'center' && styles.previewStatCenter,
        align === 'right' && styles.previewStatRight,
      ]}
    >
      <Text
        style={[
          styles.previewStatLabel,
          align === 'center' && styles.previewStatLabelCenter,
          align === 'right' && styles.previewStatLabelRight,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.previewStatValue,
          align === 'center' && styles.previewStatValueCenter,
          align === 'right' && styles.previewStatValueRight,
        ]}
      >
        {value}
      </Text>
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
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bottomDock: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderColor: colors.text,
    borderRadius: radius.md,
    height: 88,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    width: 88,
  },
  addButtonLabel: {
    fontSize: 38,
    fontWeight: '500',
    letterSpacing: -1.2,
    lineHeight: 38,
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
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.handle,
    borderRadius: radius.pill,
    height: 5,
    marginBottom: spacing.md,
    width: 38,
  },
  sheetScrollContent: {
    paddingBottom: spacing.xxl,
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
  profileName: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginTop: spacing.md,
  },
  profileMeta: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  sheetButton: {
    marginTop: spacing.lg,
  },
  detailStats: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  locationButton: {
    marginTop: spacing.md,
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
  participationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  addedByLabel: {
    color: colors.mutedText,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 16,
    marginLeft: spacing.md,
    textAlign: 'right',
  },
  addedByValue: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontWeight: '600',
  },
  previewStat: {
    flex: 1,
  },
  previewStatCenter: {
    alignItems: 'center',
  },
  previewStatRight: {
    alignItems: 'flex-end',
  },
  previewStatLabel: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 13,
    fontWeight: '500',
  },
  previewStatLabelCenter: {
    textAlign: 'center',
  },
  previewStatLabelRight: {
    textAlign: 'right',
  },
  previewStatValue: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.24,
    marginTop: spacing.xxs,
  },
  previewStatValueCenter: {
    textAlign: 'center',
  },
  previewStatValueRight: {
    textAlign: 'right',
  },
});
