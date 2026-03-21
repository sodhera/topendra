import { ACTIONS, ROLE_ORDER, ROLES } from './constants';

const ROLE_LABELS = {
  [ROLES.ANON]: 'Guest',
  [ROLES.MEMBER]: 'Member',
  [ROLES.TRUSTED]: 'Trusted scout',
  [ROLES.MODERATOR]: 'Moderator',
};

export function can(role, action) {
  switch (action) {
    case ACTIONS.BROWSE_PUBLIC:
      return true;
    case ACTIONS.CREATE_SUBMISSION:
    case ACTIONS.SAVE_DRAFT:
    case ACTIONS.WRITE_REVIEW:
    case ACTIONS.VOTE_PLACE:
    case ACTIONS.VOTE_REVIEW:
      return ROLE_ORDER[role] >= ROLE_ORDER[ROLES.MEMBER];
    case ACTIONS.LIVE_EDIT_PLACE:
      return ROLE_ORDER[role] >= ROLE_ORDER[ROLES.TRUSTED];
    case ACTIONS.ACCESS_MODERATION:
    case ACTIONS.MODERATE_SUBMISSION:
    case ACTIONS.MANAGE_TRUST:
      return role === ROLES.MODERATOR;
    default:
      return false;
  }
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? 'Unknown';
}

export function getCapabilitySummary(role) {
  switch (role) {
    case ROLES.ANON:
      return 'Can browse approved places only.';
    case ROLES.MEMBER:
      return 'Can submit places, post reviews, and vote on reliability.';
    case ROLES.TRUSTED:
      return 'Can do member actions plus live-edit approved places.';
    case ROLES.MODERATOR:
      return 'Can moderate submissions, confirm trust roles, and edit live places.';
    default:
      return '';
  }
}
