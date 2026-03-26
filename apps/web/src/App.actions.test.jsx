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
        tag: 'General',
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
        email: 'testuser@zazaspot.app',
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
  captureAnalyticsEvent,
  createComment,
  createFeedbackSubmission,
  deletePlace,
  createPlace,
  createPlaceOpenEvent,
  fetchAppData,
  identifyAnalyticsUser,
  initializeAnalytics,
  resetAnalyticsUser,
  savePlace,
  setAnalyticsContext,
  unsavePlace,
  uploadPlacePhotos,
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
    captureAnalyticsEvent: vi.fn(),
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
    createFeedbackSubmission: vi.fn(async () => undefined),
    deletePlace: vi.fn(async ({ placeId, user }) => {
      state.appData = {
        ...state.appData,
        places: state.appData.places.filter(
          (place) => !(place.id === placeId && place.createdBy === user.id)
        ),
      };
    }),
    createPlace: vi.fn(async ({ user, name, description, latitude, longitude, tag }) => {
      state.appData = {
        ...state.appData,
        places: [
          {
            id: `place-${state.nextPlaceId += 1}`,
            name,
            description,
            tag,
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
      savedPlaces: state.appData.savedPlaces ?? [],
      comments: includeComments ? state.appData.comments : [],
      commentVotes: state.appData.commentVotes,
    })),
    identifyAnalyticsUser: vi.fn(),
    initializeAnalytics: vi.fn(),
    resetAnalyticsUser: vi.fn(),
    savePlace: vi.fn(async () => undefined),
    setAnalyticsContext: vi.fn(),
    unsavePlace: vi.fn(async () => undefined),
    uploadPlacePhotos: vi.fn(async () => []),
    voteForComment: vi.fn(async () => undefined),
    voteForPlace: vi.fn(async () => undefined),
  };
});

vi.mock('./lib/analytics', () => ({
  captureAnalyticsEvent,
  identifyAnalyticsUser,
  initializeAnalytics,
  resetAnalyticsUser,
  setAnalyticsContext,
}));

vi.mock('./lib/backend', () => ({
  claimAnonymousHandle: vi.fn(async ({ handle }) => handle),
  createComment,
  createFeedbackSubmission,
  deletePlace,
  createPlace,
  createPlaceOpenEvent,
  fetchAppData,
  savePlace,
  unsavePlace,
  uploadPlacePhotos,
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
        email: 'testuser@zazaspot.app',
        user_metadata: {
          preferred_username: 'quiet_reader',
        },
      },
    };
    backendState.appData = createInitialAppData();
    backendState.nextCommentId = 1;
    backendState.nextPlaceId = 2;
    captureAnalyticsEvent.mockClear();
    createComment.mockClear();
    createFeedbackSubmission.mockClear();
    deletePlace.mockClear();
    createPlace.mockClear();
    createPlaceOpenEvent.mockClear();
    fetchAppData.mockClear();
    identifyAnalyticsUser.mockClear();
    initializeAnalytics.mockClear();
    resetAnalyticsUser.mockClear();
    savePlace.mockClear();
    setAnalyticsContext.mockClear();
    unsavePlace.mockClear();
    uploadPlacePhotos.mockClear();
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
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('place detail opened', {
      place_id: 'place-1',
      place_tag: 'General',
      source_screen: 'test_map',
    });

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
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('comment created', {
      comment_length: 'Codex comment smoke alpha'.length,
      is_reply: false,
      place_id: 'place-1',
    });
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
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('place vote changed', {
      place_id: 'place-1',
      place_tag: 'General',
      vote_value: 1,
    });

    expect(screen.getByTestId('desktop-map-open-place')).toBeTruthy();
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

  it('adds a place, returns to the main map, and shows success feedback', async () => {
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
    fireEvent.change(screen.getByTestId('place-tag-select'), {
      target: { value: 'custom' },
    });
    fireEvent.change(screen.getByTestId('place-custom-tag-input'), {
      target: { value: 'Late night study' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(createPlace).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Codex add-place smoke description',
          latitude: DEFAULT_REGION.latitude,
          longitude: DEFAULT_REGION.longitude,
          name: 'Codex place gamma',
          tag: 'Late night study',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Place added successfully.')).toBeTruthy();
    });
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('place add flow started');
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('place created', {
      has_custom_tag: true,
      photo_count: 0,
      place_name_length: 'Codex place gamma'.length,
      place_tag: 'Late night study',
    });
    expect(window.location.pathname).toBe('/');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('filters visible places by tag and keeps the map live under the panel', async () => {
    backendState.appData = {
      ...backendState.appData,
      places: [
        {
          id: 'place-2',
          name: 'Zaza Research Spot',
          description: 'Tag-filter target',
          tag: 'Zaza Spots',
          latitude: 27.718,
          longitude: 85.325,
          authorName: 'Action Seeder',
          createdAt: '2026-03-24T00:00:00.000Z',
          createdBy: 'user-2',
        },
        ...backendState.appData.places,
      ],
    };

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Profile');
    });

    fireEvent.click(screen.getByTestId('tag-filter-button'));
    fireEvent.click(screen.getByTestId('tag-filter-option-Zaza Spots'));
    fireEvent.click(screen.getByTestId('desktop-map-open-place'));

    expect(await screen.findByRole('heading', { name: 'Zaza Research Spot' })).toBeTruthy();
    expect(within(screen.getByLabelText('Place details panel')).getByText('Zaza Spots')).toBeTruthy();
    expect(window.location.pathname).toBe('/places/place-2');
    expect(screen.getByTestId('desktop-map-open-place')).toBeTruthy();
    expect(screen.getByTestId('tag-filter-button').textContent).toContain('Tags: 1');
  });

  it('deletes a place owned by the current user', async () => {
    backendState.appData = {
      ...backendState.appData,
      places: backendState.appData.places.map((place) => ({
        ...place,
        createdBy: 'user-123',
      })),
    };
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Profile');
    });

    fireEvent.click(screen.getByTestId('desktop-map-open-place'));
    expect(await screen.findByRole('heading', { name: 'Action Test Place' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(deletePlace).toHaveBeenCalledWith({
        placeId: 'place-1',
        user: expect.objectContaining({ id: 'user-123' }),
      });
    });

    await waitFor(() => {
      expect(screen.queryByLabelText('Place details panel')).toBeNull();
    });

    confirmSpy.mockRestore();
  });

  it('opens the feedback modal and stores feedback in Supabase', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Profile');
    });

    fireEvent.click(screen.getByTestId('feedback-button'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Send feedback' })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('What should we fix or improve?'), {
      target: { value: 'Please make delete confirmation clearer.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(createFeedbackSubmission).toHaveBeenCalledWith({
        body: 'Please make delete confirmation clearer.',
        pagePath: '/',
        placeId: null,
        sourceScreen: 'map_home_feedback',
        userId: 'user-123',
        viewerSessionId: expect.any(String),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Feedback sent.')).toBeTruthy();
    });
  });
});
