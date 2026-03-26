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
import { GoogleAuthCard } from '../components/GoogleAuthCard';
import { MapPlaceMarker } from '../components/MapPlaceMarker';
import { MapUserLocationMarker } from '../components/MapUserLocationMarker';
import { PlaceConversationSection } from '../components/PlaceConversationSection';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { getUserIdentity, hasAnonymousHandle, isLoggedIn } from '@topey/shared/lib/auth';
import { KATHMANDU_EXPLORE_REGION } from '@topey/shared/lib/constants';
import { getCommentsForPlace, getMapPlacesForRegion, getVoteBreakdown } from '@topey/shared/lib/geo';
import { CLEAN_MOBILE_MAP_PROPS } from '@topey/shared/lib/mobileMap';
import { openPlaceInMaps } from '../lib/locationLinks';
import { colors, radius, shadows, spacing, typography } from '@topey/shared/lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

export function HomeScreen({ navigation }) {
  const {
    state,
    isEmailAuthLoading,
    authNoticeMessage,
    errorMessage,
    requestGoogleAccess,
    claimHandle,
    signOut,
    addComment,
    voteComment,
    votePlace,
    removePlace,
    savePlace,
    unsavePlace,
    trackPlaceOpen,
    isAuthModalVisible,
    setIsAuthModalVisible,
  } = useAppContext();
  const currentUser = getUserIdentity(state.session?.user);
  const isAuthenticated = isLoggedIn(state.session);
  const canPostAnonymously = hasAnonymousHandle(state.session?.user);
  const { region: userRegion, hasResolvedInitialRegion, permissionStatus } = useLiveLocation({
    watch: false,
  });
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
  const visiblePlaces = useMemo(
    () => getMapPlacesForRegion(state.places, mapRegion, state.votes, selectedPlaceId),
    [mapRegion, selectedPlaceId, state.places, state.votes]
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

  async function handleRequestAccess() {
    try {
      await requestGoogleAccess();
    } catch (error) {
      Alert.alert('Google sign-in failed', error.message);
    }
  }

  async function handleClaimHandle({ username }) {
    try {
      await claimHandle({ handle: username });
      setIsAuthModalVisible(false);
    } catch (error) {
      Alert.alert('Anonymous name failed', error.message);
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

  async function handleDeletePlace() {
    if (!selectedPlace) {
      return;
    }

    Alert.alert(
      'Delete Place',
      'Are you sure you want to delete this place?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removePlace({ placeId: selectedPlace.id });
              setIsPlaceModalVisible(false);
            } catch (error) {
              Alert.alert('Delete failed', error.message);
            }
          },
        },
      ]
    );
  }

  async function handleToggleSavePlace() {
    if (!isAuthenticated) {
      setIsPlaceModalVisible(false);
      setIsAuthModalVisible(true);
      return;
    }
    const isSaved = state.savedPlaces?.some(s => s.placeId === selectedPlace?.id && s.userId === state.session?.user?.id);
    try {
      if (isSaved) {
        await unsavePlace({ placeId: selectedPlace.id });
      } else {
        await savePlace({ placeId: selectedPlace.id });
      }
    } catch (error) {
      Alert.alert('Save failed', error.message);
    }
  }

  async function handleComment({ body, parentCommentId = null }) {
    if (!isAuthenticated || !selectedPlace) {
      setIsPlaceModalVisible(false);
      setIsAuthModalVisible(true);
      return;
    }

    if (!canPostAnonymously) {
      setIsPlaceModalVisible(false);
      setIsAuthModalVisible(true);
      return;
    }

    try {
      await addComment({
        placeId: selectedPlace.id,
        body,
        parentCommentId,
      });
    } catch (error) {
      Alert.alert('Comment failed', error.message);
    }
  }

  async function handleCommentVote({ commentId, value }) {
    if (!isAuthenticated) {
      setIsPlaceModalVisible(false);
      setIsAuthModalVisible(true);
      return;
    }

    try {
      await voteComment({
        commentId,
        value,
      });
    } catch (error) {
      Alert.alert('Vote failed', error.message);
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
        onRegionChangeComplete={setMapRegion}
        style={StyleSheet.absoluteFill}
        testID="home-map"
      >
        {permissionStatus === 'granted' ? (
          <MapUserLocationMarker
            coordinate={{ latitude: userRegion.latitude, longitude: userRegion.longitude }}
            testID="home-user-location-marker"
          />
        ) : null}
        {visiblePlaces.map((place) => (
          <MapPlaceMarker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            selected={place.id === selectedPlaceId}
            onPress={() => handleMarkerPress(place.id)}
            testID={`home-marker-${place.id}`}
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
            onPress={() =>
              navigation.navigate('AddPlace', {
                startingRegion: mapRegion,
              })
            }
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
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ marginRight: 16 }}>
                    <CompactVoteControls
                      currentVote={currentVote}
                      direction="vertical"
                      onDownvote={() => handleVote(-1)}
                      onUpvote={() => handleVote(1)}
                      score={voteBreakdown.score}
                      style={{ marginTop: 0 }}
                      testIDPrefix="home-vote"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
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

                    <ShadButton
                      label={state.savedPlaces?.some(s => s.placeId === selectedPlace?.id && s.userId === state.session?.user?.id) ? 'Unsave' : 'Save'}
                      size="default"
                      variant="secondary"
                      shape="pill"
                      onPress={handleToggleSavePlace}
                      style={{ marginTop: 12, minHeight: 50 }}
                      labelStyle={{ fontSize: 17, fontWeight: '600', letterSpacing: -0.35 }}
                    />

                    {isAuthenticated && state.session?.user?.id === selectedPlace?.createdBy ? (
                      <ShadButton
                        label="Delete place"
                        size="default"
                        variant="secondary"
                        shape="pill"
                        onPress={handleDeletePlace}
                        style={{ marginTop: 12, minHeight: 50 }}
                        labelStyle={{ fontSize: 17, fontWeight: '600', letterSpacing: -0.35, color: '#DC2626' }}
                      />
                    ) : null}

                    <View style={styles.participationRow}>
                      <Text style={[styles.addedByLabel, { textAlign: 'left', marginLeft: 0 }]} testID="home-added-by-label">
                        Added by: <Text style={styles.addedByValue}>{selectedPlace.authorName || 'Zazaspot user'}</Text>
                      </Text>
                    </View>
                  </View>
                </View>

                <PlaceConversationSection
                  comments={comments}
                  commentVotes={state.commentVotes}
                  currentUserId={state.session?.user?.id ?? ''}
                  isAuthenticated={isAuthenticated}
                  onAddComment={handleComment}
                  onVoteComment={handleCommentVote}
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
                canPostAnonymously ? (
                  <>
                  <Text style={styles.sheetTitle}>Profile</Text>
                  <Text style={styles.profileName}>{currentUser.name}</Text>
                  {currentUser.email ? <Text style={styles.profileMeta}>{currentUser.email}</Text> : null}

                  <View style={{ marginTop: 24, marginBottom: 24, width: '100%', alignItems: 'flex-start' }}>
                    <Text style={[styles.sheetKicker, { marginBottom: 8 }]}>Saved Places</Text>
                    {state.savedPlaces?.length === 0 ? (
                      <Text style={[styles.sheetCopy, { textAlign: 'left' }]}>No saved places.</Text>
                    ) : (
                      state.savedPlaces?.map(saved => {
                        const sp = state.places.find(p => p.id === saved.placeId);
                        if (!sp) return null;
                        return (
                          <Pressable
                            key={saved.id}
                            style={{ paddingVertical: 8 }}
                            onPress={() => {
                              setIsAuthModalVisible(false);
                              setSelectedPlace(sp);
                              setIsPlaceModalVisible(true);
                              mapRef.current?.animateCamera({ center: { latitude: sp.latitude, longitude: sp.longitude } });
                            }}
                          >
                            <Text style={{ fontSize: 16, color: '#2563EB', fontWeight: '500' }}>{sp.name}</Text>
                          </Pressable>
                        );
                      })
                    )}
                  </View>

                  <ShadButton
                    label="Sign out"
                    shape="pill"
                    onPress={handleSignOut}
                    style={styles.sheetButton}
                  />
                  </>
                ) : (
                  <>
                    <GoogleAuthCard
                      authBusy={isEmailAuthLoading}
                      helperText={authNoticeMessage}
                      mode="handle"
                      onClaimHandle={handleClaimHandle}
                    />
                    {errorMessage ? <Text style={styles.sheetMeta}>{errorMessage}</Text> : null}
                  </>
                )
              ) : (
                <>
                  <GoogleAuthCard
                    authBusy={isEmailAuthLoading}
                    helperText={authNoticeMessage}
                    mode="auth"
                    onRequestAccess={handleRequestAccess}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
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
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 2,
    height: 72,
    justifyContent: 'center',
    width: 72,
    ...shadows.floating,
  },
  addButtonLabel: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1.2,
    lineHeight: 34,
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
    borderWidth: 2,
    borderBottomWidth: 0,
    maxHeight: '80%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.handle,
    borderRadius: radius.sm,
    height: 8,
    marginBottom: spacing.md,
    width: 56,
  },
  sheetScrollContent: {
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1,
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
