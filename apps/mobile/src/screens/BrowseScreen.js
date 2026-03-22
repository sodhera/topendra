import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import { isLoggedIn } from '@topey/shared/lib/auth';
import { DEFAULT_REGION, KATHMANDU_EXPLORE_REGION } from '@topey/shared/lib/constants';
import { getCommentsForPlace, getVoteBreakdown } from '@topey/shared/lib/geo';
import { CLEAN_MOBILE_MAP_PROPS } from '@topey/shared/lib/mobileMap';
import { openPlaceInMaps } from '../lib/locationLinks';
import { colors, radius, shadows, spacing, typography } from '@topey/shared/lib/theme';

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
    isEmailAuthLoading,
    authNoticeMessage,
    errorMessage,
    requestEmailAccess,
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
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');

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

  async function handleEmailAccess() {
    try {
      await requestEmailAccess({ email, username });
      Alert.alert('Check your email', 'We sent you a sign-in link. Open it on this device to unlock place drops, voting, and discussion.');
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

  async function handleComment({ body }) {
    if (!isAuthenticated || !selectedPlace) {
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
                  testID="browse-open-location-button"
                />

                <View style={styles.participationRow}>
                  <CompactVoteControls
                    currentVote={currentVote}
                    onDownvote={() => handleVote(-1)}
                    onUpvote={() => handleVote(1)}
                    score={voteBreakdown.score}
                    style={styles.voteControls}
                    testIDPrefix="browse-vote"
                  />
                  <Text style={styles.addedByLabel} testID="browse-added-by-label">
                    Added by: <Text style={styles.addedByValue}>{selectedPlace.authorName || 'Topey user'}</Text>
                  </Text>
                </View>

                <PlaceConversationSection
                  comments={comments}
                  isAuthenticated={isAuthenticated}
                  lockedCopy="View more opens the conversation only for signed-in users right now."
                  onAddComment={handleComment}
                  onRequireAuth={() => {
                    setIsDetailsModalVisible(false);
                    setIsAuthModalVisible(true);
                  }}
                  placeName={selectedPlace.name}
                  testIDPrefix="browse"
                />
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
              Use email access to read threads, vote, and post comments. Choose an anonymous public username.
            </Text>
            <EmailAuthCard
              email={email}
              username={username}
              onEmailChange={setEmail}
              onUsernameChange={setUsername}
              onSubmit={handleEmailAccess}
              authBusy={isEmailAuthLoading}
              helperText={authNoticeMessage}
            />
            {errorMessage ? <Text style={styles.sheetMeta}>{errorMessage}</Text> : null}
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
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
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
});
