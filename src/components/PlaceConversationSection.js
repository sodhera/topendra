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
import { colors, radius, shadows, spacing, typography } from '../lib/theme';

function getAuthorName(comment) {
  return comment?.authorName || 'Topey user';
}

export function PlaceConversationSection({
  comments,
  isAuthenticated,
  lockedCopy,
  onAddComment,
  onRequireAuth,
  placeName,
  testIDPrefix,
}) {
  const [commentDraft, setCommentDraft] = useState('');
  const [isComposerModalVisible, setIsComposerModalVisible] = useState(false);
  const [isDiscussionModalVisible, setIsDiscussionModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [commentVotes, setCommentVotes] = useState({});
  const previewComments = useMemo(() => comments.slice(0, 2), [comments]);

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
      });
      closeComposer();
    } catch (error) {
      Alert.alert('Comment failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCommentVote(commentId, value) {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    setCommentVotes((currentVotes) => {
      const currentValue = currentVotes[commentId] ?? 0;

      return {
        ...currentVotes,
        [commentId]: currentValue === value ? 0 : value,
      };
    });
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.lockedCard}>
        <Text style={styles.lockedTitle}>Log in to read threads.</Text>
        <Text style={styles.lockedCopy}>{lockedCopy}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={requireAuth}
          style={styles.loginButton}
          testID={`${testIDPrefix}-login-button`}
        >
          <Text style={styles.loginButtonLabel}>Log in</Text>
        </Pressable>
      </View>
    );
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
        animationType="slide"
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
              {comments.map((comment, index) => (
                <View key={comment.id} style={styles.discussionComment}>
                  {index > 0 ? <View style={styles.discussionSeparator} /> : null}
                  <Text style={styles.commentAuthor}>{getAuthorName(comment)}</Text>
                  <Text style={styles.commentBody}>{comment.body}</Text>
                  <View style={styles.commentActionRow}>
                    <CommentArrowButton
                      direction="up"
                      isActive={(commentVotes[comment.id] ?? 0) === 1}
                      onPress={() => handleCommentVote(comment.id, 1)}
                      testID={`${testIDPrefix}-comment-up-${comment.id}`}
                    />
                    <Text style={styles.commentVoteScore}>
                      {formatSignedValue(commentVotes[comment.id] ?? 0)}
                    </Text>
                    <CommentArrowButton
                      direction="down"
                      isActive={(commentVotes[comment.id] ?? 0) === -1}
                      onPress={() => handleCommentVote(comment.id, -1)}
                      testID={`${testIDPrefix}-comment-down-${comment.id}`}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => openComposer(comment)}
                      style={styles.replyButton}
                    >
                      <Text style={styles.replyButtonLabel}>Reply</Text>
                    </Pressable>
                  </View>
                </View>
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
        animationType="slide"
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
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    bottom: 0,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    width: 48,
  },
  composeFabLabel: {
    color: colors.primaryText,
    fontFamily: typography.semibold,
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 26,
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
    ...shadows.floating,
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
  discussionSeparator: {
    backgroundColor: colors.separator,
    height: 0.75,
    marginBottom: spacing.md,
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
  loginButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    paddingRight: spacing.sm,
  },
  loginButtonLabel: {
    color: colors.primary,
    fontFamily: typography.semibold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
