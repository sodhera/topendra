export const ROLES = {
  ANON: 'anon',
  MEMBER: 'member',
  TRUSTED: 'trusted',
  MODERATOR: 'moderator',
};

export const ROLE_ORDER = {
  [ROLES.ANON]: 0,
  [ROLES.MEMBER]: 1,
  [ROLES.TRUSTED]: 2,
  [ROLES.MODERATOR]: 3,
};

export const MODERATION_STATES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  NEEDS_MORE_PROOF: 'needs_more_proof',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const EVIDENCE_TYPES = [
  { label: 'Moderator scout note', value: 'moderator_scout' },
  { label: 'Founder scout note', value: 'founder_scout' },
  { label: 'Operator confirmation', value: 'operator_confirmation' },
  { label: 'Trusted user observation', value: 'trusted_user_observation' },
];

export const ACTIONS = {
  BROWSE_PUBLIC: 'browse_public',
  CREATE_SUBMISSION: 'create_submission',
  SAVE_DRAFT: 'save_draft',
  WRITE_REVIEW: 'write_review',
  VOTE_PLACE: 'vote_place',
  VOTE_REVIEW: 'vote_review',
  ACCESS_MODERATION: 'access_moderation',
  MODERATE_SUBMISSION: 'moderate_submission',
  LIVE_EDIT_PLACE: 'live_edit_place',
  MANAGE_TRUST: 'manage_trust',
};

export const KATHMANDU_NEIGHBORHOODS = [
  'Lazimpat',
  'Boudha',
  'Baneshwor',
  'Thamel',
  'Baluwatar',
  'Patan',
  'Jawalakhel',
  'Sanepa',
  'Kirtipur',
  'Bhaktapur',
];

export const STORAGE_KEY = 'topey-demo-state-v1';

export const MAP_HINTS = [
  { label: 'Thamel', x: 22, y: 27 },
  { label: 'Boudha', x: 69, y: 29 },
  { label: 'Patan', x: 42, y: 67 },
  { label: 'Baneshwor', x: 58, y: 54 },
];
