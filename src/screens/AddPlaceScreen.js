import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { ACTIONS, MODERATION_STATES } from '../lib/constants';
import { can } from '../lib/auth';
import { colors, spacing, typography } from '../lib/theme';
import { Chip } from '../components/Chip';
import { PlaceForm } from '../components/PlaceForm';
import { WindowPanel } from '../components/WindowPanel';

export function AddPlaceScreen() {
  const { state, dispatch } = useAppContext();
  const currentUser = state.users.find((user) => user.id === state.currentUserId);
  const [selectedDraftId, setSelectedDraftId] = useState(null);

  const drafts = useMemo(
    () =>
      state.submissions.filter(
        (submission) =>
          submission.authorId === currentUser.id &&
          [MODERATION_STATES.DRAFT, MODERATION_STATES.NEEDS_MORE_PROOF].includes(submission.status)
      ),
    [currentUser.id, state.submissions]
  );

  if (!can(currentUser.role, ACTIONS.CREATE_SUBMISSION)) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <WindowPanel title="Members only" subtitle="Guest mode can browse, but submissions need an account.">
            <Text style={styles.copy}>
              Switch to Maya, Sagar, or Anika on the Profile tab to test submission flow, optional photos, drafts, and moderation queue behavior.
            </Text>
          </WindowPanel>
        </ScrollView>
      </View>
    );
  }

  const activeDraft = drafts.find((draft) => draft.id === selectedDraftId) || null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {drafts.length ? (
          <WindowPanel title="Open drafts" subtitle="Resume unfinished scouting notes or queue resubmissions that need more proof.">
            <View style={styles.draftStack}>
              {drafts.map((draft) => (
                <Pressable key={draft.id} onPress={() => setSelectedDraftId(draft.id)} style={styles.draftCard}>
                  <View style={styles.draftTop}>
                    <Text style={styles.draftTitle}>{draft.title || 'Untitled draft'}</Text>
                    <Chip label={draft.status.replaceAll('_', ' ')} tone={draft.status === MODERATION_STATES.NEEDS_MORE_PROOF ? 'warning' : 'info'} />
                  </View>
                  <Text style={styles.draftMeta}>{draft.neighborhood || 'No neighborhood yet'}</Text>
                  {draft.moderatorNote ? <Text style={styles.draftNote}>{draft.moderatorNote}</Text> : null}
                </Pressable>
              ))}
            </View>
          </WindowPanel>
        ) : null}

        <PlaceForm
          initialValues={activeDraft || {}}
          submitLabel={activeDraft?.status === MODERATION_STATES.NEEDS_MORE_PROOF ? 'Resubmit for review' : 'Submit for review'}
          onSaveDraft={(formValues) => {
            dispatch({
              type: 'save_submission_draft',
              payload: {
                authorId: currentUser.id,
                formValues,
                submissionId: activeDraft?.id,
              },
            });
            Alert.alert('Draft saved', 'The place is saved locally and can be reopened from this screen.');
          }}
          onSubmit={(formValues) => {
            dispatch({
              type: 'submit_place',
              payload: {
                authorId: currentUser.id,
                formValues,
                submissionId: activeDraft?.id,
              },
            });
            setSelectedDraftId(null);
            Alert.alert('Submitted', 'The place is now in the moderation queue.');
          }}
        />
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
  draftStack: {
    gap: spacing.sm,
  },
  draftCard: {
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(216, 194, 142, 0.14)',
    backgroundColor: 'rgba(18, 23, 17, 0.28)',
  },
  draftTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  draftTitle: {
    flex: 1,
    color: colors.savePage,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
  draftMeta: {
    color: colors.textDim,
    fontFamily: typography.mono,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  draftNote: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    marginTop: spacing.sm,
  },
});
