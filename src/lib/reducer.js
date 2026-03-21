import { buildSeedState } from '../data/seed';
import { ACTIONS, MODERATION_STATES, ROLES } from './constants';
import { can } from './auth';
import { canTransitionModeration } from './moderation';
import { normalizePlaceFacts, validatePlaceFacts } from './placeFacts';

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getUserById(state, userId) {
  return state.users.find((user) => user.id === userId);
}

function replaceById(collection, nextItem) {
  return collection.map((item) => (item.id === nextItem.id ? nextItem : item));
}

function mergeVote(collection, payload) {
  const existing = collection.find(
    (item) => item.userId === payload.userId && item[payload.entityKey] === payload.entityId
  );

  if (existing && existing.value === payload.value) {
    return collection.filter((item) => item.id !== existing.id);
  }

  if (existing) {
    return collection.map((item) =>
      item.id === existing.id ? { ...item, value: payload.value, updatedAt: payload.updatedAt } : item
    );
  }

  return [
    ...collection,
    {
      id: createId(payload.prefix),
      userId: payload.userId,
      [payload.entityKey]: payload.entityId,
      value: payload.value,
      updatedAt: payload.updatedAt,
    },
  ];
}

function buildLivePlaceFromSubmission(submission, moderatorId, approvedAt) {
  return {
    id: `place-${submission.id}`,
    name: submission.title,
    neighborhood: submission.neighborhood,
    summary: submission.summary,
    bestTime: submission.bestTime,
    allowedActions: submission.allowedActions,
    restrictions: submission.restrictions,
    coords: submission.coords,
    photos: submission.photos,
    tags: [...submission.allowedActions.slice(0, 2), submission.neighborhood],
    distanceMinutes: 10,
    confirmationCount: 1,
    lastScoutAt: approvedAt,
    moderation: {
      approvedBy: moderatorId,
      approvedAt,
      evidenceType: submission.evidenceType,
      note: submission.evidenceNote,
    },
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'hydrate_state':
      return action.payload || state;
    case 'reset_demo':
      return buildSeedState();
    case 'switch_user':
      return { ...state, currentUserId: action.payload };
    case 'save_submission_draft': {
      const author = getUserById(state, action.payload.authorId);

      if (!author || !can(author.role, ACTIONS.SAVE_DRAFT)) {
        return state;
      }

      const now = new Date().toISOString();
      const normalized = normalizePlaceFacts(action.payload.formValues);
      const existing = state.submissions.find((item) => item.id === action.payload.submissionId);
      const nextDraft = {
        ...(existing || {
          id: createId('submission'),
          kind: 'new_place',
          authorId: action.payload.authorId,
          createdAt: now,
        }),
        ...normalized,
        updatedAt: now,
        status: MODERATION_STATES.DRAFT,
        moderatorNote: existing?.moderatorNote || '',
      };

      const submissions = existing
        ? replaceById(state.submissions, nextDraft)
        : [...state.submissions, nextDraft];

      return { ...state, submissions };
    }
    case 'submit_place': {
      const author = getUserById(state, action.payload.authorId);

      if (!author || !can(author.role, ACTIONS.CREATE_SUBMISSION)) {
        return state;
      }

      const now = new Date().toISOString();
      const validation = validatePlaceFacts(action.payload.formValues, { mode: 'submitted' });

      if (!validation.isValid) {
        return state;
      }

      const existing = state.submissions.find((item) => item.id === action.payload.submissionId);
      const nextSubmission = {
        ...(existing || {
          id: createId('submission'),
          kind: 'new_place',
          authorId: action.payload.authorId,
          createdAt: now,
        }),
        ...validation.facts,
        updatedAt: now,
        status: MODERATION_STATES.SUBMITTED,
        moderatorNote: '',
      };

      const submissions = existing
        ? replaceById(state.submissions, nextSubmission)
        : [...state.submissions, nextSubmission];

      return { ...state, submissions };
    }
    case 'moderate_submission': {
      const moderator = getUserById(state, action.payload.moderatorId);
      const submission = state.submissions.find((item) => item.id === action.payload.submissionId);

      if (!moderator || !submission || !can(moderator.role, ACTIONS.MODERATE_SUBMISSION)) {
        return state;
      }

      if (!canTransitionModeration(submission.status, action.payload.nextState)) {
        return state;
      }

      const updatedSubmission = {
        ...submission,
        status: action.payload.nextState,
        moderatorNote: action.payload.note || '',
        updatedAt: new Date().toISOString(),
      };

      let places = state.places;
      let auditLog = state.auditLog;

      if (action.payload.nextState === MODERATION_STATES.APPROVED) {
        const approvedAt = new Date().toISOString();
        const nextPlace = buildLivePlaceFromSubmission(updatedSubmission, moderator.id, approvedAt);
        const alreadyExists = places.some((place) => place.id === nextPlace.id);
        places = alreadyExists ? replaceById(places, nextPlace) : [nextPlace, ...places];
        auditLog = [
          {
            id: createId('audit'),
            placeId: nextPlace.id,
            actorId: moderator.id,
            actorRole: moderator.role,
            changeType: 'submission_approved',
            reason: action.payload.note || 'Approved from moderation queue.',
            beforeSnapshot: alreadyExists ? places.find((place) => place.id === nextPlace.id) : null,
            afterSnapshot: nextPlace,
            createdAt: approvedAt,
          },
          ...auditLog,
        ];
      }

      return {
        ...state,
        submissions: replaceById(state.submissions, updatedSubmission),
        places,
        auditLog,
      };
    }
    case 'add_review': {
      const author = getUserById(state, action.payload.authorId);
      if (!author || !can(author.role, ACTIONS.WRITE_REVIEW)) {
        return state;
      }

      const nextReview = {
        id: createId('review'),
        placeId: action.payload.placeId,
        authorId: action.payload.authorId,
        body: action.payload.body.trim(),
        createdAt: new Date().toISOString(),
      };

      return { ...state, reviews: [nextReview, ...state.reviews] };
    }
    case 'toggle_review_vote': {
      const user = getUserById(state, action.payload.userId);
      if (!user || !can(user.role, ACTIONS.VOTE_REVIEW)) {
        return state;
      }

      return {
        ...state,
        reviewVotes: mergeVote(state.reviewVotes, {
          prefix: 'review-vote',
          entityKey: 'reviewId',
          entityId: action.payload.reviewId,
          userId: action.payload.userId,
          value: action.payload.value,
          updatedAt: new Date().toISOString(),
        }),
      };
    }
    case 'toggle_place_vote': {
      const user = getUserById(state, action.payload.userId);
      if (!user || !can(user.role, ACTIONS.VOTE_PLACE)) {
        return state;
      }

      return {
        ...state,
        placeVotes: mergeVote(state.placeVotes, {
          prefix: 'place-vote',
          entityKey: 'placeId',
          entityId: action.payload.placeId,
          userId: action.payload.userId,
          value: action.payload.value,
          updatedAt: new Date().toISOString(),
        }),
      };
    }
    case 'live_edit_place': {
      const actor = getUserById(state, action.payload.actorId);
      const targetPlace = state.places.find((place) => place.id === action.payload.placeId);

      if (!actor || !targetPlace || !can(actor.role, ACTIONS.LIVE_EDIT_PLACE)) {
        return state;
      }

      const validation = validatePlaceFacts(action.payload.formValues, { mode: 'live_edit' });
      if (!validation.isValid) {
        return state;
      }

      const nextPlace = {
        ...targetPlace,
        name: validation.facts.title,
        neighborhood: validation.facts.neighborhood,
        summary: validation.facts.summary,
        bestTime: validation.facts.bestTime,
        allowedActions: validation.facts.allowedActions,
        restrictions: validation.facts.restrictions,
        coords: validation.facts.coords,
        photos: validation.facts.photos,
        lastScoutAt: new Date().toISOString(),
        confirmationCount: targetPlace.confirmationCount + 1,
        moderation: {
          ...targetPlace.moderation,
          evidenceType: validation.facts.evidenceType,
          note: validation.facts.evidenceNote,
        },
      };

      return {
        ...state,
        places: replaceById(state.places, nextPlace),
        auditLog: [
          {
            id: createId('audit'),
            placeId: targetPlace.id,
            actorId: actor.id,
            actorRole: actor.role,
            changeType: 'live_edit',
            reason: action.payload.reason,
            beforeSnapshot: {
              bestTime: targetPlace.bestTime,
              allowedActions: targetPlace.allowedActions,
              restrictions: targetPlace.restrictions,
              summary: targetPlace.summary,
            },
            afterSnapshot: {
              bestTime: nextPlace.bestTime,
              allowedActions: nextPlace.allowedActions,
              restrictions: nextPlace.restrictions,
              summary: nextPlace.summary,
            },
            createdAt: new Date().toISOString(),
          },
          ...state.auditLog,
        ],
      };
    }
    case 'set_user_role': {
      const actor = getUserById(state, action.payload.actorId);
      if (!actor || actor.role !== ROLES.MODERATOR) {
        return state;
      }

      const nextUsers = state.users.map((user) => {
        if (user.id !== action.payload.userId || user.id === 'anon') {
          return user;
        }

        return {
          ...user,
          role: action.payload.nextRole,
          confirmedTrusted: action.payload.nextRole !== ROLES.MEMBER,
        };
      });

      return { ...state, users: nextUsers };
    }
    default:
      return state;
  }
}
