import React, { useMemo, useState } from 'react';
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
import { colors, radius, spacing, typography } from '@topey/shared/lib/theme';

function getAuthorName(comment) {
  return comment?.authorName || 'Topey user';
}

function sortCommentsByCreatedAtDescending(left, right) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function sortCommentsByCreatedAtAscending(left, right) {
  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

function sortRepliesAscending(comment) {
  comment.replies.sort(sortCommentsByCreatedAtAscending);
  comment.replies.forEach(sortRepliesAscending);
}

function buildCommentThreads(comments) {
  const commentNodes = new Map(
    comments.map((comment) => [
      comment.id,
      {
        ...comment,
        replies: [],
      },
    ])
  );
  const rootThreads = [];

  commentNodes.forEach((comment) => {
    if (comment.parentCommentId && commentNodes.has(comment.parentCommentId)) {
      commentNodes.get(comment.parentCommentId).replies.push(comment);
      return;
    }

    rootThreads.push(comment);
  });

  rootThreads.sort(sortCommentsByCreatedAtDescending);
  rootThreads.forEach(sortRepliesAscending);
  return rootThreads;
}

export function PlaceConversationSection({
  comments,
  commentVotes = [],
  currentUserId = '',
  isAuthenticated,
  onAddComment,
  onRequireAuth,
  onVoteComment,
  placeName,
  testIDPrefix,
}) {
  const [commentDraft, setCommentDraft] = useState('');
  const [isComposerModalVisible, setIsComposerModalVisible] = useState(false);
  const [isDiscussionModalVisible, setIsDiscussionModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const commentThreads = useMemo(() => buildCommentThreads(comments), [comments]);
  const previewComments = useMemo(() => commentThreads.slice(0, 2), [commentThreads]);
  const voteState = useMemo(() => {
    const currentVoteByCommentId = {};
    const scoreByCommentId = {};

    commentVotes.forEach((vote) => {
      scoreByCommentId[vote.commentId] = (scoreByCommentId[vote.commentId] ?? 0) + vote.value;

      if (vote.userId === currentUserId) {
        currentVoteByCommentId[vote.commentId] = vote.value;
      }
    });

    return {
      currentVoteByCommentId,
      scoreByCommentId,
    };
  }, [commentVotes, currentUserId]);

  function requireAuth() {
    setIsComposerModalVisible(false);
    setIsDiscussionModalVisible(false);
    onRequireAuth?.();
  }

  function openComposer(nextReplyTarget = null) {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    setReplyTarget(nextReplyTarget);
    setCommentDraft(nextReplyTarget ? `@${getAuthorName(nextReplyTarget)} ` : '');
    setIsComposerModalVisible(true);
  }

  function closeComposer() {
    setIsComposerModalVisible(false);
    setCommentDraft('');
    setReplyTarget(null);
  }

  function openDiscussion() {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    setIsDiscussionModalVisible(true);
  }

  async function handleSubmitComment() {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    if (!commentDraft.trim()) {
      Alert.alert('Missing comment', 'Write something before posting.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddComment({
        body: commentDraft,
        parentCommentId: replyTarget?.id ?? null,
      });
      closeComposer();
    } catch (error) {
      Alert.alert('Comment failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCommentVote(commentId, value) {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    try {
      await onVoteComment?.({
        commentId,
        value,
      });
    } catch (error) {
      Alert.alert('Vote failed', error.message);
    }
  }

  return (
    <>
      <View style={styles.previewShell}>
        <View style={styles.previewStack} testID={`${testIDPrefix}-thread-preview`}>
          {previewComments.length ? (
            previewComments.map((comment, index) => {
              const isLastPreview = index === previewComments.length - 1;
              const shouldFadeOut = previewComments.length > 1 && isLastPreview;

              return (
                <View key={comment.id} style={styles.previewCommentBlock}>
                  {index > 0 ? <View style={styles.previewSeparator} /> : null}
                  <View style={styles.previewCommentCard}>
                    <Text style={styles.commentAuthor}>{getAuthorName(comment)}</Text>
                    <Text numberOfLines={shouldFadeOut ? 2 : undefined} style={styles.commentBody}>
                      {comment.body}
                    </Text>
                    {shouldFadeOut ? (
                      <View pointerEvents="box-none" style={styles.previewFadeOverlay}>
                        <View style={styles.previewFadeBandLight} />
                        <View style={styles.previewFadeBandMid} />
                        <View style={styles.previewFadeBandHeavy} />
                        <Pressable
                          accessibilityRole="button"
                          onPress={openDiscussion}
                          style={styles.discussionButton}
                          testID={`${testIDPrefix}-discussion-open-button`}
                        >
                          <Text style={styles.discussionButtonLabel}>See More</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No discussion yet.</Text>
              <Text style={styles.emptyCopy}>Start the first comment for this place.</Text>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => openComposer(null)}
          style={styles.composeFab}
          testID={`${testIDPrefix}-comment-compose-button`}
        >
          <Text style={styles.composeFabLabel}>+</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isDiscussionModalVisible}
        onRequestClose={() => setIsDiscussionModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          style={styles.modalRoot}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsDiscussionModalVisible(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Discussion</Text>
            <Text style={styles.sheetSubtitle}>{placeName}</Text>

            <ScrollView
              contentContainerStyle={styles.discussionContent}
              showsVerticalScrollIndicator={false}
            >
              {commentThreads.map((commentThread, index) => (
                <DiscussionThread
                  key={commentThread.id}
                  comment={commentThread}
                  currentVote={voteState.currentVoteByCommentId[commentThread.id] ?? 0}
                  depth={0}
                  index={index}
                  onReply={openComposer}
                  onVote={handleCommentVote}
                  score={voteState.scoreByCommentId[commentThread.id] ?? 0}
                  testIDPrefix={testIDPrefix}
                  voteState={voteState}
                />
              ))}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              onPress={() => openComposer(null)}
              style={[styles.composeFab, styles.discussionFab]}
              testID={`${testIDPrefix}-discussion-compose-button`}
            >
              <Text style={styles.composeFabLabel}>+</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isComposerModalVisible}
        onRequestClose={closeComposer}
      >
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeComposer} />
          <View style={styles.composerSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{replyTarget ? `Reply to ${getAuthorName(replyTarget)}` : 'Add a comment'}</Text>
            <TextInput
              autoFocus
              multiline
              placeholder={replyTarget ? 'Write your reply' : 'Write your comment'}
              placeholderTextColor={colors.mutedText}
              style={styles.composerInput}
              value={commentDraft}
              onChangeText={setCommentDraft}
            />
            <View style={styles.composerActions}>
              <Pressable accessibilityRole="button" onPress={closeComposer} style={styles.secondaryAction}>
                <Text style={styles.secondaryActionLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleSubmitComment}
                style={styles.primaryAction}
                testID={`${testIDPrefix}-comment-send-button`}
              >
                <Text style={styles.primaryActionLabel}>{isSubmitting ? 'Sending' : 'Post'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function DiscussionThread({
  comment,
  currentVote,
  depth,
  index,
  onReply,
  onVote,
  score,
  testIDPrefix,
  voteState,
}) {
  return (
    <View
      style={[
        styles.discussionThread,
        depth > 0 && styles.nestedThread,
      ]}
    >
      {index > 0 && depth === 0 ? <View style={styles.discussionSeparator} /> : null}
      <View style={styles.discussionComment}>
        <Text style={styles.commentAuthor}>{getAuthorName(comment)}</Text>
        <Text style={styles.commentBody}>{comment.body}</Text>
        <View style={styles.commentActionRow}>
          <CommentArrowButton
            direction="up"
            isActive={currentVote === 1}
            onPress={() => onVote(comment.id, 1)}
            testID={`${testIDPrefix}-comment-up-${comment.id}`}
          />
          <Text style={styles.commentVoteScore}>{formatSignedValue(score)}</Text>
          <CommentArrowButton
            direction="down"
            isActive={currentVote === -1}
            onPress={() => onVote(comment.id, -1)}
            testID={`${testIDPrefix}-comment-down-${comment.id}`}
          />
          <Pressable accessibilityRole="button" onPress={() => onReply(comment)} style={styles.replyButton}>
            <Text style={styles.replyButtonLabel}>Reply</Text>
          </Pressable>
        </View>
      </View>

      {comment.replies?.length ? (
        <View style={styles.threadReplies}>
          {comment.replies.map((reply, replyIndex) => (
            <DiscussionThread
              key={reply.id}
              comment={reply}
              currentVote={voteState.currentVoteByCommentId[reply.id] ?? 0}
              depth={Math.min(depth + 1, 3)}
              index={replyIndex}
              onReply={onReply}
              onVote={onVote}
              score={voteState.scoreByCommentId[reply.id] ?? 0}
              testIDPrefix={testIDPrefix}
              voteState={voteState}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CommentArrowButton({ direction, isActive, onPress, testID }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.commentArrowButton} testID={testID}>
      <Text style={[styles.commentArrowLabel, isActive && styles.commentArrowLabelActive]}>
        {direction === 'up' ? '↑' : '↓'}
      </Text>
    </Pressable>
  );
}

function formatSignedValue(value) {
  if (value > 0) {
    return `+${value}`;
  }

  return `${value}`;
}

const styles = StyleSheet.create({
  previewShell: {
    marginTop: spacing.md,
    paddingBottom: 44,
    position: 'relative',
  },
  previewStack: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 0.75,
    overflow: 'hidden',
  },
  previewCommentBlock: {
    position: 'relative',
  },
  previewSeparator: {
    backgroundColor: colors.separator,
    height: 0.75,
    marginHorizontal: spacing.md,
  },
  previewCommentCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    position: 'relative',
  },
  previewFadeOverlay: {
    alignItems: 'stretch',
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  previewFadeBandLight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: '76%',
  },
  previewFadeBandMid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    top: '16%',
    bottom: '12%',
  },
  previewFadeBandHeavy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    top: '24%',
  },
  discussionButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  discussionButtonLabel: {
    color: colors.primary,
    fontFamily: typography.semibold,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 22,
    textAlign: 'center',
  },
  composeFab: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    bottom: 0,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 40,
  },
  composeFabLabel: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: -2,
  },
  discussionFab: {
    bottom: spacing.lg,
    right: spacing.lg,
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
    maxHeight: '86%',
    minHeight: 420,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  composerSheet: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 0.75,
    borderBottomWidth: 0,
    paddingBottom: spacing.xl,
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
  sheetTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  sheetSubtitle: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  discussionContent: {
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  discussionComment: {
    paddingVertical: spacing.md,
  },
  discussionThread: {
    position: 'relative',
  },
  discussionSeparator: {
    backgroundColor: colors.separator,
    height: 0.75,
    marginBottom: spacing.md,
  },
  nestedThread: {
    marginLeft: spacing.md,
    paddingLeft: spacing.md,
  },
  threadReplies: {
    borderLeftColor: colors.separator,
    borderLeftWidth: 0.75,
    marginLeft: spacing.xs,
  },
  commentAuthor: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  commentBody: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  commentActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  commentArrowButton: {
    paddingVertical: spacing.xxs,
  },
  commentArrowLabel: {
    color: colors.mutedText,
    fontFamily: typography.semibold,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  commentArrowLabelActive: {
    color: colors.primary,
  },
  commentVoteScore: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.16,
    minWidth: 24,
  },
  replyButton: {
    marginLeft: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  replyButtonLabel: {
    color: colors.primary,
    fontFamily: typography.medium,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.16,
  },
  composerInput: {
    backgroundColor: colors.elevatedCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 0.75,
    color: colors.text,
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 22,
    marginTop: spacing.md,
    minHeight: 132,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  composerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  secondaryAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  secondaryActionLabel: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 90,
    paddingHorizontal: spacing.md,
  },
  primaryActionLabel: {
    color: colors.primaryText,
    fontFamily: typography.semibold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.16,
  },
  emptyState: {
    padding: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
});
