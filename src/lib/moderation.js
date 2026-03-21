import { EVIDENCE_TYPES, MODERATION_STATES } from './constants';

export const ALLOWED_TRANSITIONS = {
  [MODERATION_STATES.DRAFT]: [MODERATION_STATES.SUBMITTED],
  [MODERATION_STATES.SUBMITTED]: [
    MODERATION_STATES.NEEDS_MORE_PROOF,
    MODERATION_STATES.APPROVED,
    MODERATION_STATES.REJECTED,
  ],
  [MODERATION_STATES.NEEDS_MORE_PROOF]: [
    MODERATION_STATES.APPROVED,
    MODERATION_STATES.REJECTED,
  ],
  [MODERATION_STATES.APPROVED]: [],
  [MODERATION_STATES.REJECTED]: [],
};

export function canTransitionModeration(currentState, nextState) {
  return ALLOWED_TRANSITIONS[currentState]?.includes(nextState) ?? false;
}

export function getEvidenceLabel(type) {
  return EVIDENCE_TYPES.find((item) => item.value === type)?.label ?? 'Observed pattern';
}

export function buildModeratorChecklist(submission) {
  return [
    {
      label: 'Pin is specific enough to find on foot',
      done: Boolean(submission.coords && Number.isFinite(submission.coords.x)),
    },
    {
      label: 'Allowed actions are explicit',
      done: submission.allowedActions.length > 0,
    },
    {
      label: 'Restrictions are explicit',
      done: submission.restrictions.length > 0,
    },
    {
      label: 'Proof basis is recorded',
      done: Boolean(submission.evidenceType && submission.evidenceNote),
    },
  ];
}
