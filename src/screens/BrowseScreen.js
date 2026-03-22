import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { isLoggedIn } from '../lib/auth';
import { distanceInKm, getCommentsForPlace, getPlaceScore } from '../lib/geo';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

export function BrowseScreen({ navigation }) {
  const { state, dispatch } = useAppContext();
  const { region, setRegion, errorMessage } = useLiveLocation();
  const [selectedPlaceId, setSelectedPlaceId] = useState(state.places[0]?.id);
  const [commentDraft, setCommentDraft] = useState('');

  const selectedPlace = useMemo(
    () => state.places.find((place) => place.id === selectedPlaceId) || state.places[0],
    [selectedPlaceId, state.places]
  );

  const selectedScore = getPlaceScore(state.votes, selectedPlace?.id);
  const comments = getCommentsForPlace(state.comments, selectedPlace?.id);
  const selectedDistance = distanceInKm(region, selectedPlace);

  function requireLogin() {
    Alert.alert('Login required', 'Switch to the demo user on the home screen to vote or comment.');
  }

  function handleVote(value) {
    if (!isLoggedIn(state.currentUserId)) {
      requireLogin();
      return;
    }

    dispatch({
      type: 'vote_place',
      payload: {
        placeId: selectedPlace.id,
        userId: state.currentUserId,
        value,
      },
    });
  }

  function handleComment() {
    if (!isLoggedIn(state.currentUserId)) {
      requireLogin();
      return;
    }

    dispatch({
      type: 'add_comment',
      payload: {
        placeId: selectedPlace.id,
        userId: state.currentUserId,
        body: commentDraft,
      },
    });
    setCommentDraft('');
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        followsUserLocation
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
          <Text style={styles.placeName}>{selectedPlace?.name}</Text>
          <Text style={styles.placeCopy}>{selectedPlace?.description}</Text>
          <Text style={styles.meta}>
            {selectedDistance ? `${selectedDistance.toFixed(1)} km away` : 'Nearby'}
          </Text>
          {errorMessage ? <Text style={styles.subtle}>{errorMessage}</Text> : null}

          <View style={styles.voteRow}>
            <VoteButton icon="thumb-up-outline" label="Upvote" onPress={() => handleVote(1)} />
            <View style={styles.scorePill}>
              <Text style={styles.scoreText}>{selectedScore}</Text>
            </View>
            <VoteButton icon="thumb-down-outline" label="Downvote" onPress={() => handleVote(-1)} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {state.places.map((place) => (
              <Pressable
                key={place.id}
                onPress={() => {
                  setSelectedPlaceId(place.id);
                  setRegion({
                    ...region,
                    latitude: place.latitude,
                    longitude: place.longitude,
                  });
                }}
                style={[
                  styles.placeChip,
                  place.id === selectedPlace?.id && styles.placeChipActive,
                ]}
              >
                <Text style={styles.placeChipText}>{place.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comments</Text>
            {!isLoggedIn(state.currentUserId) ? (
              <Text style={styles.subtle}>Login on the home screen to join in.</Text>
            ) : null}
          </View>

          {isLoggedIn(state.currentUserId) ? (
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
          ) : null}

          <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <Text style={styles.commentAuthor}>
                  {state.users.find((user) => user.id === comment.authorId)?.name || 'User'}
                </Text>
                <Text style={styles.commentBody}>{comment.body}</Text>
              </View>
            ))}
            {comments.length === 0 ? <Text style={styles.subtle}>No comments yet.</Text> : null}
          </ScrollView>
        </View>
      </SafeAreaView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
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
    maxHeight: '58%',
    minHeight: 360,
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
  meta: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  subtle: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  voteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  scorePill: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    paddingHorizontal: spacing.md,
  },
  scoreText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 16,
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
    marginBottom: spacing.xs,
  },
  commentBody: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
