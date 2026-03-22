import { buildSeedState } from '@topey/shared/data/seed';
import { isLoggedIn } from '@topey/shared/lib/auth';

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value) {
  return value?.trim() ?? '';
}

export function reducer(state, action) {
  switch (action.type) {
    case 'hydrate_state':
      return action.payload || state;
    case 'switch_user':
      return { ...state, currentUserId: action.payload };
    case 'add_place': {
      const name = normalizeText(action.payload.name);
      const description = normalizeText(action.payload.description);
      const latitude = Number(action.payload.latitude);
      const longitude = Number(action.payload.longitude);

      if (!name || !description || Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return state;
      }

      return {
        ...state,
        places: [
          {
            id: createId('place'),
            name,
            description,
            latitude,
            longitude,
            createdBy: action.payload.authorId,
            createdAt: new Date().toISOString(),
          },
          ...state.places,
        ],
      };
    }
    case 'vote_place': {
      if (!isLoggedIn(action.payload.userId)) {
        return state;
      }

      const existingVote = state.votes.find(
        (vote) => vote.userId === action.payload.userId && vote.placeId === action.payload.placeId
      );

      if (existingVote && existingVote.value === action.payload.value) {
        return {
          ...state,
          votes: state.votes.filter((vote) => vote.id !== existingVote.id),
        };
      }

      return {
        ...state,
        votes: existingVote
          ? state.votes.map((vote) =>
              vote.id === existingVote.id ? { ...vote, value: action.payload.value } : vote
            )
          : [
              ...state.votes,
              {
                id: createId('vote'),
                placeId: action.payload.placeId,
                userId: action.payload.userId,
                value: action.payload.value,
              },
            ],
      };
    }
    case 'add_comment': {
      const body = normalizeText(action.payload.body);

      if (!isLoggedIn(action.payload.userId) || !body) {
        return state;
      }

      return {
        ...state,
        comments: [
          {
            id: createId('comment'),
            placeId: action.payload.placeId,
            authorId: action.payload.userId,
            body,
            createdAt: new Date().toISOString(),
          },
          ...state.comments,
        ],
      };
    }
    case 'reset_demo':
      return buildSeedState();
    default:
      return state;
  }
}
