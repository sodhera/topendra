import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { ACTIONS, MODERATION_STATES } from '../lib/constants';
import { can } from '../lib/auth';
import { buildModeratorChecklist, getEvidenceLabel } from '../lib/moderation';
import { colors, spacing, typography } from '../lib/theme';
import { Chip } from '../components/Chip';
import { WindowPanel } from '../components/WindowPanel';

export function ModerationScreen() {
  const { state, dispatch } = useAppContext();
  const currentUser = state.users.find((user) => user.id === state.currentUserId);

  if (!can(currentUser.role, ACTIONS.ACCESS_MODERATION)) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <WindowPanel title="Moderator queue" subtitle="Only moderators can approve, reject, or request more proof.">
            <Text style={styles.copy}>
              This queue exists so the public map never turns into a random hiding-spot feed. Switch to Anika on the Profile tab to test the state machine.
            </Text>
          </WindowPanel>
        </ScrollView>
      </View>
    );
  }

  const actionable = state.submissions.filter((submission) =>
    [MODERATION_STATES.SUBMITTED, MODERATION_STATES.NEEDS_MORE_PROOF].includes(submission.status)
  );

  const handled = state.submissions.filter((submission) =>
    [MODERATION_STATES.REJECTED, MODERATION_STATES.DRAFT].includes(submission.status)
  );

  const moderate = (submissionId, nextState, note) => {
    dispatch({
      type: 'moderate_submission',
      payload: {
        moderatorId: currentUser.id,
        submissionId,
        nextState,
        note,
      },
    });

    Alert.alert('Queue updated', `Submission moved to ${nextState.replaceAll('_', ' ')}.`);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <WindowPanel title="Action queue" subtitle="Five-state moderation flow with public visibility only after approval.">
          <View style={styles.stack}>
            {actionable.map((submission) => {
              const author = state.users.find((user) => user.id === submission.authorId);
              const checklist = buildModeratorChecklist(submission);
              return (
                <View key={submission.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{submission.title}</Text>
                      <Text style={styles.cardMeta}>{author?.name} · {submission.neighborhood}</Text>
                    </View>
                    <Chip label={submission.status.replaceAll('_', ' ')} tone={submission.status === MODERATION_STATES.NEEDS_MORE_PROOF ? 'warning' : 'info'} />
                  </View>

                  <Text style={styles.summary}>{submission.summary}</Text>
                  <Text style={styles.meta}>Evidence: {getEvidenceLabel(submission.evidenceType)}</Text>
                  <Text style={styles.note}>{submission.evidenceNote}</Text>

                  <View style={styles.checklist}>
                    {checklist.map((item) => (
                      <Text key={item.label} style={styles.checklistItem}>
                        {item.done ? '✓' : '•'} {item.label}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => moderate(submission.id, MODERATION_STATES.NEEDS_MORE_PROOF, 'Need fresher, more explicit proof before publishing.')}
                      style={[styles.actionButton, styles.secondary]}
                    >
                      <Text style={styles.actionText}>Needs proof</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => moderate(submission.id, MODERATION_STATES.REJECTED, 'Rejected because the listing is not specific or defensible enough for the public map.')}
                      style={[styles.actionButton, styles.reject]}
                    >
                      <Text style={styles.actionText}>Reject</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => moderate(submission.id, MODERATION_STATES.APPROVED, 'Approved after reviewing structured rules and proof basis.')}
                      style={[styles.actionButton, styles.approve]}
                    >
                      <Text style={styles.actionText}>Approve</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </WindowPanel>

        <WindowPanel title="Non-actionable records" subtitle="Drafts and rejections remain private but still documented.">
          <View style={styles.stack}>
            {handled.map((submission) => (
              <View key={submission.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{submission.title || 'Untitled draft'}</Text>
                  <Chip label={submission.status.replaceAll('_', ' ')} tone="warning" />
                </View>
                {submission.moderatorNote ? <Text style={styles.note}>{submission.moderatorNote}</Text> : null}
              </View>
            ))}
          </View>
        </WindowPanel>
      </ScrollView>
    </View>
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
  copy: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  stack: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(216, 194, 142, 0.14)',
    backgroundColor: 'rgba(18, 23, 17, 0.28)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    color: colors.savePage,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
  cardMeta: {
    color: colors.textDim,
    fontFamily: typography.mono,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  summary: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  meta: {
    color: colors.textDim,
    fontFamily: typography.mono,
    fontSize: 11,
    marginTop: spacing.sm,
  },
  note: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  checklist: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  checklistItem: {
    color: colors.savePage,
    fontFamily: typography.body,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondary: {
    backgroundColor: 'rgba(18, 23, 17, 0.4)',
    borderColor: 'rgba(216, 194, 142, 0.22)',
  },
  reject: {
    backgroundColor: 'rgba(192, 106, 72, 0.16)',
    borderColor: 'rgba(192, 106, 72, 0.42)',
  },
  approve: {
    backgroundColor: 'rgba(110, 138, 59, 0.36)',
    borderColor: 'rgba(179, 146, 69, 0.35)',
  },
  actionText: {
    color: colors.savePage,
    fontFamily: typography.bodyBold,
    fontSize: 12,
  },
});
