import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { ACTIONS } from '../lib/constants';
import { can } from '../lib/auth';
import {
  computePlaceConfidence,
  formatDateLabel,
  formatRelativeDate,
  getPlaceVotes,
  getReviewVotes,
  getReviewsForPlace,
} from '../lib/trust';
import { colors, radius, spacing, typography } from '../lib/theme';
import { Chip } from '../components/Chip';
import { ConfidenceMeter } from '../components/ConfidenceMeter';
import { PhotoStrip } from '../components/PhotoStrip';
import { WindowPanel } from '../components/WindowPanel';

export function PlaceDetailScreen({ navigation, route }) {
  const { state, dispatch } = useAppContext();
  const { placeId } = route.params;
  const place = state.places.find((item) => item.id === placeId);
  const currentUser = state.users.find((user) => user.id === state.currentUserId);
  const [reviewText, setReviewText] = useState('');

  const reviews = useMemo(() => getReviewsForPlace(state, placeId), [placeId, state]);
  const placeVotes = getPlaceVotes(state, placeId);

  if (!place) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Place not found</Text>
      </View>
    );
  }

  const confidence = computePlaceConfidence(state, place);
  const canWriteReview = can(currentUser.role, ACTIONS.WRITE_REVIEW);
  const canLiveEdit = can(currentUser.role, ACTIONS.LIVE_EDIT_PLACE);

  const submitReview = () => {
    if (!canWriteReview) {
      Alert.alert('Switch to a member profile', 'Guest mode can browse, but only members can add reviews.');
      return;
    }

    if (!reviewText.trim()) {
      return;
    }

    dispatch({
      type: 'add_review',
      payload: {
        placeId,
        authorId: currentUser.id,
        body: reviewText,
      },
    });
    setReviewText('');
    Alert.alert('Review added', 'Your traveler note is now attached to this place.');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <WindowPanel
        title={place.name}
        subtitle={`${place.neighborhood} · last checked ${formatRelativeDate(place.lastScoutAt)}`}
        right={<Chip label="Approved" tone="success" />}
      >
        <Text style={styles.summary}>{place.summary}</Text>
        <ConfidenceMeter score={confidence} />
        <View style={styles.metaRow}>
          <Chip label={place.bestTime} tone="warning" />
          <Chip label={`${place.confirmationCount} confirmations`} tone="info" />
        </View>
        {canLiveEdit ? (
          <Pressable
            onPress={() => navigation.navigate('EditPlace', { placeId })}
            style={styles.editButton}
          >
            <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.savePage} />
            <Text style={styles.editButtonText}>Live edit place</Text>
          </Pressable>
        ) : null}
      </WindowPanel>

      <WindowPanel title="Scout photos" subtitle="Optional visuals, never required for a valid listing.">
        <PhotoStrip photos={place.photos} />
      </WindowPanel>

      <WindowPanel title="Rules and proof" subtitle={`Approved on ${formatDateLabel(place.moderation.approvedAt)}`}>
        <Text style={styles.blockLabel}>Allowed</Text>
        <View style={styles.metaRow}>
          {place.allowedActions.map((item) => (
            <Chip key={item} label={item} tone="success" />
          ))}
        </View>
        <Text style={styles.blockLabel}>Restrictions</Text>
        <View style={styles.metaRow}>
          {place.restrictions.map((item) => (
            <Chip key={item} label={item} tone="warning" />
          ))}
        </View>
        <Text style={styles.proofText}>{place.moderation.note}</Text>
      </WindowPanel>

      <WindowPanel title="Reliability votes" subtitle="Crowd signal supports moderation, not the other way around.">
        <Text style={styles.voteCopy}>
          Net reliability score: {placeVotes.reduce((sum, vote) => sum + vote.value, 0)}
        </Text>
        <View style={styles.voteRow}>
          <Pressable
            onPress={() =>
              dispatch({
                type: 'toggle_place_vote',
                payload: { placeId, userId: currentUser.id, value: 1 },
              })
            }
            style={styles.voteButton}
          >
            <MaterialCommunityIcons name="thumb-up-outline" size={16} color={colors.savePage} />
            <Text style={styles.voteLabel}>Reliable</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              dispatch({
                type: 'toggle_place_vote',
                payload: { placeId, userId: currentUser.id, value: -1 },
              })
            }
            style={styles.voteButton}
          >
            <MaterialCommunityIcons name="thumb-down-outline" size={16} color={colors.savePage} />
            <Text style={styles.voteLabel}>Risky now</Text>
          </Pressable>
        </View>
      </WindowPanel>

      <WindowPanel title="Traveler notes" subtitle="Conversation belongs to the place, not a global feed.">
        <TextInput
          value={reviewText}
          onChangeText={setReviewText}
          placeholder="Share what happened, when you went, and what people should know."
          placeholderTextColor={colors.textDim}
          multiline
          style={styles.reviewInput}
        />
        <Pressable onPress={submitReview} style={styles.reviewSubmit}>
          <Text style={styles.reviewSubmitText}>Post review</Text>
        </Pressable>

        <View style={styles.reviewStack}>
          {reviews.map((review) => {
            const author = state.users.find((user) => user.id === review.authorId);
            const voteNet = getReviewVotes(state, review.id).reduce((sum, vote) => sum + vote.value, 0);

            return (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View>
                    <Text style={styles.reviewAuthor}>{author?.name || 'Unknown scout'}</Text>
                    <Text style={styles.reviewMeta}>{formatRelativeDate(review.createdAt)}</Text>
                  </View>
                  <Chip label={`${voteNet >= 0 ? '+' : ''}${voteNet}`} tone="info" compact />
                </View>
                <Text style={styles.reviewBody}>{review.body}</Text>
                <View style={styles.reviewActions}>
                  <Pressable
                    onPress={() =>
                      dispatch({
                        type: 'toggle_review_vote',
                        payload: { reviewId: review.id, userId: currentUser.id, value: 1 },
                      })
                    }
                    style={styles.reviewVote}
                  >
                    <MaterialCommunityIcons name="arrow-up-bold-outline" size={16} color={colors.savePage} />
                    <Text style={styles.voteLabel}>Useful</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      dispatch({
                        type: 'toggle_review_vote',
                        payload: { reviewId: review.id, userId: currentUser.id, value: -1 },
                      })
                    }
                    style={styles.reviewVote}
                  >
                    <MaterialCommunityIcons name="arrow-down-bold-outline" size={16} color={colors.savePage} />
                    <Text style={styles.voteLabel}>Off now</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </WindowPanel>

      {canLiveEdit ? (
        <WindowPanel title="Recent audit trail" subtitle="Live-place changes require a receipt.">
          {state.auditLog
            .filter((entry) => entry.placeId === placeId)
            .slice(0, 3)
            .map((entry) => {
              const actor = state.users.find((user) => user.id === entry.actorId);
              return (
                <View key={entry.id} style={styles.auditRow}>
                  <Text style={styles.auditTitle}>{entry.changeType.replace('_', ' ')}</Text>
                  <Text style={styles.auditMeta}>{actor?.name} · {formatRelativeDate(entry.createdAt)}</Text>
                  <Text style={styles.auditReason}>{entry.reason}</Text>
                </View>
              );
            })}
        </WindowPanel>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.nightRoot,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.nightRoot,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.savePage,
    fontFamily: typography.display,
    fontSize: 18,
  },
  summary: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.md,
  },
  editButton: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(216, 194, 142, 0.22)',
    backgroundColor: 'rgba(18, 23, 17, 0.35)',
  },
  editButtonText: {
    color: colors.savePage,
    fontFamily: typography.bodyBold,
    fontSize: 13,
  },
  blockLabel: {
    color: colors.savePage,
    fontFamily: typography.displayRegular,
    fontSize: 13,
    marginTop: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  proofText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    marginTop: spacing.md,
  },
  voteCopy: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  voteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  voteButton: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(216, 194, 142, 0.22)',
    backgroundColor: 'rgba(18, 23, 17, 0.35)',
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  voteLabel: {
    color: colors.savePage,
    fontFamily: typography.bodyMedium,
    fontSize: 13,
  },
  reviewInput: {
    backgroundColor: 'rgba(18, 23, 17, 0.45)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(216, 194, 142, 0.18)',
    color: colors.textPrimary,
    fontFamily: typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    minHeight: 110,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  reviewSubmit: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.antiqueGold,
    backgroundColor: colors.mossCore,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  reviewSubmitText: {
    color: colors.savePage,
    fontFamily: typography.bodyBold,
    fontSize: 13,
  },
  reviewStack: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  reviewCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(216, 194, 142, 0.18)',
    backgroundColor: 'rgba(18, 23, 17, 0.32)',
    padding: spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  reviewAuthor: {
    color: colors.savePage,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
  reviewMeta: {
    color: colors.textDim,
    fontFamily: typography.mono,
    fontSize: 11,
  },
  reviewBody: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  reviewVote: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  auditRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 194, 142, 0.08)',
  },
  auditTitle: {
    color: colors.savePage,
    fontFamily: typography.displayRegular,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  auditMeta: {
    color: colors.textDim,
    fontFamily: typography.mono,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  auditReason: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
