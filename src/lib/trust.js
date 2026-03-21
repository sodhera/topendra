import { ROLES } from './constants';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function daysAgoFromNow(isoDate) {
  const parsed = new Date(isoDate).getTime();
  return Math.max(0, Math.floor((Date.now() - parsed) / DAY_IN_MS));
}

export function formatDateLabel(isoDate) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoDate));
}

export function formatRelativeDate(isoDate) {
  const days = daysAgoFromNow(isoDate);

  if (days === 0) {
    return 'today';
  }

  if (days === 1) {
    return '1 day ago';
  }

  return `${days} days ago`;
}

export function getVoteNet(votes) {
  return votes.reduce((sum, vote) => sum + vote.value, 0);
}

export function getPlaceVotes(state, placeId) {
  return state.placeVotes.filter((vote) => vote.placeId === placeId);
}

export function getReviewsForPlace(state, placeId) {
  return state.reviews
    .filter((review) => review.placeId === placeId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getReviewVotes(state, reviewId) {
  return state.reviewVotes.filter((vote) => vote.reviewId === reviewId);
}

export function getTrustSignalsForUser(state, userId) {
  const approvedSubmissions = state.submissions.filter(
    (submission) => submission.authorId === userId && submission.status === 'approved'
  ).length;
  const reviews = state.reviews.filter((review) => review.authorId === userId).length;
  const auditChanges = state.auditLog.filter((item) => item.actorId === userId).length;
  return approvedSubmissions * 3 + reviews + auditChanges * 2;
}

export function computePlaceConfidence(state, place) {
  const reviews = getReviewsForPlace(state, place.id);
  const placeVotes = getPlaceVotes(state, place.id);
  const reviewVoteNet = reviews.reduce((sum, review) => {
    return sum + getVoteNet(getReviewVotes(state, review.id));
  }, 0);
  const placeVoteNet = getVoteNet(placeVotes);
  const freshness = daysAgoFromNow(place.lastScoutAt);

  let score = 55;

  if (place.moderation?.evidenceType === 'operator_confirmation') {
    score += 15;
  } else if (place.moderation?.evidenceType === 'moderator_scout') {
    score += 12;
  } else if (place.moderation?.evidenceType === 'founder_scout') {
    score += 10;
  } else {
    score += 8;
  }

  score += clamp(place.confirmationCount, 0, 12);
  score += clamp(placeVoteNet * 4, -10, 12);
  score += clamp(reviewVoteNet * 2, -8, 10);

  if (freshness <= 7) {
    score += 10;
  } else if (freshness <= 30) {
    score += 6;
  } else if (freshness <= 60) {
    score += 2;
  } else {
    score -= 6;
  }

  return clamp(Math.round(score), 35, 98);
}

export function getConfidenceLabel(score) {
  if (score >= 85) {
    return 'Very reliable';
  }

  if (score >= 72) {
    return 'Solid';
  }

  if (score >= 60) {
    return 'Use judgment';
  }

  return 'Needs more confirmation';
}

export function sortPlacesForDiscover(state, places) {
  return [...places].sort((a, b) => {
    const confidenceDelta = computePlaceConfidence(state, b) - computePlaceConfidence(state, a);

    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    return a.distanceMinutes - b.distanceMinutes;
  });
}

export function getUserBadgeColor(role) {
  switch (role) {
    case ROLES.TRUSTED:
      return '#A7C957';
    case ROLES.MODERATOR:
      return '#B39245';
    case ROLES.MEMBER:
      return '#8CB89E';
    default:
      return '#D8C28E';
  }
}
