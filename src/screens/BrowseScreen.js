import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButtons } from '../components/AuthButtons';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { isLoggedIn } from '../lib/auth';
import { DEFAULT_REGION } from '../lib/constants';
import { distanceInKm, getCommentsForPlace, getVoteBreakdown } from '../lib/geo';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

export function BrowseScreen({ navigation }) {
  const {
    state,
    authBusyProvider,
    errorMessage: appError,
    signInWithOAuth,
    votePlace,
    addComment,
  } = useAppContext();
  const { region: userRegion, errorMessage: locationError } = useLiveLocation({ watch: false });
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [hasCenteredMap, setHasCenteredMap] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [commentDraft, setCommentDraft] = useState('');

  useEffect(() => {
    if (!hasCenteredMap) {
      setMapRegion(userRegion);
      setHasCenteredMap(true);
    }
  }, [hasCenteredMap, userRegion]);

  useEffect(() => {
    if (!state.places.length) {
      setSelectedPlaceId('');
      return;
    }

    if (!state.places.some((place) => place.id === selectedPlaceId)) {
      setSelectedPlaceId(state.places[0].id);
    }
  }, [selectedPlaceId, state.places]);

  const isAuthenticated = isLoggedIn(state.session);
  const selectedPlace = useMemo(
    () => state.places.find((place) => place.id === selectedPlaceId) || state.places[0] || null,
    [selectedPlaceId, state.places]
  );
  const voteBreakdown = getVoteBreakdown(state.votes, selectedPlace?.id);
  const comments = getCommentsForPlace(state.comments, selectedPlace?.id);
  const selectedDistance = distanceInKm(userRegion, selectedPlace);

  async function handleProviderPress(provider) {
    try {
      await signInWithOAuth(provider);
    } catch (error) {
      return;
    }
  }

  async function handleVote(value) {
    if (!isAuthenticated || !selectedPlace) {
      Alert.alert('Login required', 'Sign in with Google or Facebook before voting on a place.');
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
      Alert.alert('Login required', 'Comments are only available to logged-in users.');
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
        onRegionChangeComplete={setMapRegion}
        showsUserLocation
      >
        {state.places.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            pinColor={place.id === selectedPlace?.id ? '#FFFFFF' : colors.accent}
            onPress={() => setSelectedPlaceId(place.id)}
          />
        ))}
      </MapView>
      <View style={styles.scrim} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <ShadButton label="Back" size="compact" variant="secondary" onPress={() => navigation.goBack()} />
          <ShadButton label="Add a place" size="compact" onPress={() => navigation.navigate('AddPlace')} />
        </View>

        <View style={styles.sheet}>
          <View style={styles.handle} />

          {selectedPlace ? (
            <>
              <Text style={styles.placeName}>{selectedPlace.name}</Text>
              <Text style={styles.placeCopy}>{selectedPlace.description}</Text>

              <View style={styles.metaGrid}>
                <MetaItem
                  label="Distance from user"
                  value={selectedDistance ? `${selectedDistance.toFixed(1)} km` : 'Locating you'}
                />
                <MetaItem
                  label="Upvotes/downvotes"
                  value={`${voteBreakdown.ratioLabel} (${voteBreakdown.score >= 0 ? '+' : ''}${voteBreakdown.score})`}
                />
              </View>

              <View style={styles.voteRow}>
                <VoteButton icon="thumb-up-outline" label="Upvote" onPress={() => handleVote(1)} />
                <VoteButton icon="thumb-down-outline" label="Downvote" onPress={() => handleVote(-1)} />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
              >
                {state.places.map((place) => (
                  <Pressable
                    key={place.id}
                    onPress={() => {
                      setSelectedPlaceId(place.id);
                      setMapRegion({
                        ...mapRegion,
                        latitude: place.latitude,
                        longitude: place.longitude,
                      });
                    }}
                    style={[styles.placeChip, place.id === selectedPlace.id && styles.placeChipActive]}
                  >
                    <Text style={styles.placeChipText}>{place.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments</Text>
                <Text style={styles.subtle}>
                  {isAuthenticated
                    ? `${comments.length} loaded for this place`
                    : 'Login required before reading or posting comments.'}
                </Text>
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
                      <View key={comment.id} style={styles.commentCard}>
                        <Text style={styles.commentAuthor}>{comment.authorName || 'Topey user'}</Text>
                        <Text style={styles.commentBody}>{comment.body}</Text>
                      </View>
                    ))}
                    {comments.length === 0 ? <Text style={styles.subtle}>No comments yet.</Text> : null}
                  </ScrollView>
                </>
              ) : (
                <View style={styles.lockedCard}>
                  <Text style={styles.lockedTitle}>Comments are private to logged-in users.</Text>
                  <Text style={styles.lockedCopy}>
                    Sign in once and this place widget will show the full discussion thread.
                  </Text>
                  <AuthButtons compact busyProvider={authBusyProvider} onProviderPress={handleProviderPress} />
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.placeName}>No places loaded yet</Text>
              <Text style={styles.placeCopy}>Seed the Supabase project or add the first place after logging in.</Text>
            </View>
          )}

          {appError ? <Text style={styles.subtle}>{appError}</Text> : null}
          {locationError ? <Text style={styles.subtle}>{locationError}</Text> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

function MetaItem({ label, value }) {
  return (
    <View style={styles.metaCard}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function VoteButton({ icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.voteButton}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.text} />
      <Text style={styles.voteLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheet: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    maxHeight: '68%',
    minHeight: 420,
    padding: spacing.md,
    ...shadows.floating,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 5,
    marginBottom: spacing.md,
    width: 44,
  },
  placeName: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 24,
  },
  placeCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metaCard: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  metaLabel: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  metaValue: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  subtle: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  voteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  voteButton: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
  },
  voteLabel: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
    marginLeft: spacing.sm,
  },
  carousel: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  placeChip: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  placeChipActive: {
    backgroundColor: colors.elevatedCard,
  },
  placeChipText: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  commentsHeader: {
    marginBottom: spacing.sm,
  },
  commentsTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 18,
  },
  commentComposer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontFamily: typography.body,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  commentsList: {
    flex: 1,
  },
  commentCard: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  commentAuthor: {
    color: colors.text,
    fontFamily: typography.medium,
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
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
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
    marginTop: spacing.xs,
  },
  emptyState: {
    paddingVertical: spacing.lg,
  },
});
