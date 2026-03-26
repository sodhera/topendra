import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_REGION } from '@topey/shared/lib/constants';

function createInitialAppData() {
  return {
    places: [
      {
        id: 'place-1',
        name: 'Action Test Place',
        description: 'Action test description',
        latitude: 27.7172,
        longitude: 85.324,
        authorName: 'Action Seeder',
        createdAt: '2026-03-23T00:00:00.000Z',
        createdBy: 'user-1',
      },
    ],
    votes: [],
    comments: [],
    commentVotes: [],
  };
}

const { authState, signOut } = vi.hoisted(() => {
  const state = {
    callback: null,
    session: {
      user: {
        id: 'user-123',
        email: 'testuser@topey.app',
        user_metadata: {
          preferred_username: 'quiet_reader',
        },
      },
    },
  };

  return {
    authState: state,
    signOut: vi.fn(async () => {
      state.session = null;
      state.callback?.('SIGNED_OUT', null);
    }),
  };
});

const {
  backendState,
  createComment,
  createPlace,
  createPlaceOpenEvent,
  fetchAppData,
  voteForComment,
  voteForPlace,
} = vi.hoisted(() => {
  const state = {
    appData: createInitialAppData(),
    nextCommentId: 1,
    nextPlaceId: 2,
  };

  return {
    backendState: state,
    createComment: vi.fn(async ({ placeId, parentCommentId = null, user, body }) => {
      state.appData = {
        ...state.appData,
        comments: [
          {
            id: `comment-${state.nextCommentId += 1}`,
            placeId,
            parentCommentId,
            authorId: user.id,
            authorName: user.user_metadata?.preferred_username ?? 'Anonymous member',
            body,
            createdAt: '2026-03-23T00:10:00.000Z',
          },
          ...state.appData.comments,
        ],
      };
    }),
    createPlace: vi.fn(async ({ user, name, description, latitude, longitude }) => {
      state.appData = {
        ...state.appData,
        places: [
          {
            id: `place-${state.nextPlaceId += 1}`,
            name,
            description,
            latitude,
            longitude,
            authorName: user.user_metadata?.preferred_username ?? 'Anonymous member',
            createdAt: '2026-03-23T00:20:00.000Z',
            createdBy: user.id,
          },
          ...state.appData.places,
        ],
      };
    }),
    createPlaceOpenEvent: vi.fn(async () => undefined),
    fetchAppData: vi.fn(async ({ includeComments }) => ({
      ...state.appData,
      comments: includeComments ? state.appData.comments : [],
      commentVotes: state.appData.commentVotes,
    })),
    voteForComment: vi.fn(async () => undefined),
    voteForPlace: vi.fn(async () => undefined),
  };
});

vi.mock('./lib/backend', () => ({
  claimAnonymousHandle: vi.fn(async ({ handle }) => handle),
  createComment,
  createPlace,
  createPlaceOpenEvent,
  fetchAppData,
  voteForComment,
  voteForPlace,
}));

vi.mock('./lib/supabase', () => ({
  getSafeSession: vi.fn(async () => ({
    session: authState.session,
    recoveredFromInvalidToken: false,
  })),
  hasSupabaseConfig: true,
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        authState.callback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
      signOut,
    },
  },
}));

vi.mock('./components/DesktopMap', () => ({
  default: function DesktopMapMock({ onSelectPlace, visiblePlaces }) {
    const firstVisiblePlace = visiblePlaces[0];

    return (
      <button
        data-testid="desktop-map-open-place"
        type="button"
        onClick={() =>
          onSelectPlace(firstVisiblePlace.id, {
            openModal: true,
            sourceScreen: 'test_map',
          })
        }
      >
        Open visible place
      </button>
    );
  },
}));

describe('App web actions', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    authState.callback = null;
    authState.session = {
      user: {
        id: 'user-123',
        email: 'testuser@topey.app',
        user_metadata: {
          preferred_username: 'quiet_reader',
        },
      },
    };
    backendState.appData = createInitialAppData();
    backendState.nextCommentId = 1;
    backendState.nextPlaceId = 2;
    createComment.mockClear();
    createPlace.mockClear();
    createPlaceOpenEvent.mockClear();
    fetchAppData.mockClear();
    voteForPlace.mockClear();
    signOut.mockClear();
  });

  it('navigates to a place page and keeps comment actions on that page', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Profile');
    });

    fireEvent.click(screen.getByTestId('desktop-map-open-place'));

    expect(await screen.findByRole('heading', { name: 'Action Test Place' })).toBeTruthy();
    expect(window.location.pathname).toBe('/places/place-1');
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Comment' }));

    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Add a comment' })).toBeTruthy();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    fireEvent.change(screen.getByPlaceholderText('Write your comment'), {
      target: { value: 'Codex comment smoke alpha' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Post' }));

    await waitFor(() => {
      expect(screen.getByText('Codex comment smoke alpha')).toBeTruthy();
    });
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Codex comment smoke alpha',
        parentCommentId: null,
        placeId: 'place-1',
      })
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Reply to u/quiet_reader' })).toBeTruthy();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    fireEvent.change(screen.getByPlaceholderText('Write your reply'), {
      target: { value: 'Codex reply smoke beta' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Post' }));

    await waitFor(() => {
      expect(screen.getByText('Codex reply smoke beta')).toBeTruthy();
    });
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Codex reply smoke beta',
        parentCommentId: 'comment-2',
        placeId: 'place-1',
      })
    );
    const replyThread = screen.getByText('Codex comment smoke alpha').closest('.comment-thread');
    expect(replyThread).toBeTruthy();
    expect(within(replyThread).getByText('Codex reply smoke beta')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Upvote place' }));

    await waitFor(() => {
      expect(voteForPlace).toHaveBeenCalledWith({
        placeId: 'place-1',
        userId: 'user-123',
        value: 1,
      });
    });
  });

  it('updates the place vote score immediately before the backend resolves', async () => {
    let resolveVoteRequest;

    voteForPlace.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveVoteRequest = resolve;
        })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Profile');
    });

    fireEvent.click(screen.getByTestId('desktop-map-open-place'));
    expect(await screen.findByRole('heading', { name: 'Action Test Place' })).toBeTruthy();
    expect(screen.getByText(/^0 points$/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Upvote place' }));

    expect(screen.getByText(/\+1 points/i)).toBeTruthy();

    resolveVoteRequest?.();

    await waitFor(() => {
      expect(voteForPlace).toHaveBeenCalledWith({
        placeId: 'place-1',
        userId: 'user-123',
        value: 1,
      });
    });
  });

  it('adds a place and opens the new place page', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Profile');
    });

    fireEvent.click(screen.getByTestId('add-place-button'));
    fireEvent.click(await screen.findByTestId('add-place-bottom-button'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Place details' })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Place name'), {
      target: { value: 'Codex place gamma' },
    });
    fireEvent.change(screen.getByPlaceholderText('Description'), {
      target: { value: 'Codex add-place smoke description' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(createPlace).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Codex add-place smoke description',
          latitude: DEFAULT_REGION.latitude,
          longitude: DEFAULT_REGION.longitude,
          name: 'Codex place gamma',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Codex place gamma' })).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/places/place-3');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
