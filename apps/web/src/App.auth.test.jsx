import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const appData = {
  places: [
    {
      id: 'place-1',
      name: 'Auth Test Place',
      description: 'Test description',
      tag: 'General',
      latitude: 27.7172,
      longitude: 85.324,
      authorName: 'Auth Seeder',
      createdAt: '2026-03-23T00:00:00.000Z',
      createdBy: 'user-1',
      threadCount: 1,
    },
  ],
  votes: [],
  comments: [],
  commentVotes: [],
};

const {
  authState,
  claimAnonymousHandle,
  signInWithOAuth,
  signOut,
} = vi.hoisted(() => {
  const state = {
    callback: null,
    session: null,
    nextSession: null,
  };

  return {
    authState: state,
    claimAnonymousHandle: vi.fn(async ({ handle }) => handle),
    signInWithOAuth: vi.fn(async () => {
      state.session = state.nextSession;
      state.callback?.('SIGNED_IN', state.session);
      return { error: null };
    }),
    signOut: vi.fn(async () => {
      state.session = null;
      state.callback?.('SIGNED_OUT', null);
      return { error: null };
    }),
  };
});

vi.mock('./lib/backend', () => ({
  claimAnonymousHandle,
  createComment: vi.fn(),
  createPlace: vi.fn(),
  createPlaceOpenEvent: vi.fn(),
  fetchAppData: vi.fn(async () => appData),
  uploadPlacePhotos: vi.fn(async () => []),
  voteForComment: vi.fn(),
  voteForPlace: vi.fn(),
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
      signInWithOAuth,
      signOut,
    },
  },
}));

vi.mock('./components/DesktopMap', () => ({
  default: function DesktopMapMock() {
    return <div data-testid="desktop-map" />;
  },
}));

describe('App web auth', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    authState.callback = null;
    authState.session = null;
    authState.nextSession = null;
    claimAnonymousHandle.mockClear();
    signInWithOAuth.mockClear();
    signOut.mockClear();
  });

  it('requests Google sign-in, lands in profile, and signs out', async () => {
    authState.nextSession = {
      user: {
        id: 'user-123',
        email: 'testuser@topey.app',
        user_metadata: {
          preferred_username: 'quiet_reader',
        },
      },
    };

    render(<App />);

    fireEvent.click(await screen.findByTestId('account-button'));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign in with Google' }));

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Profile');
    });

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/',
      },
    });
    expect(claimAnonymousHandle).toHaveBeenCalledWith({
      user: expect.objectContaining({
        email: 'testuser@topey.app',
      }),
      handle: 'quiet_reader',
    });

    fireEvent.click(screen.getByTestId('account-button'));
    const profileDialog = await screen.findByRole('dialog');
    fireEvent.click(within(profileDialog).getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Sign in');
    });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('keeps the auth sheet open to claim a handle when email sign-in returns without one', async () => {
    authState.nextSession = {
      user: {
        id: 'user-signup',
        email: 'signup@topey.app',
        user_metadata: {},
      },
    };

    render(<App />);

    fireEvent.click(await screen.findByTestId('account-button'));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign in with Google' }));

    expect(
      await screen.findByRole('heading', { name: 'Choose your anonymous name' })
    ).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save anonymous name' })).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText('Anonymous name'), {
      target: { value: 'Quiet Reader' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save anonymous name' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    expect(claimAnonymousHandle).toHaveBeenCalledWith({
      user: expect.objectContaining({
        email: 'signup@topey.app',
      }),
      handle: 'Quiet Reader',
    });
  });

  it('removes background shell controls from the accessibility tree while auth is open', async () => {
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Add a place' })).toBeTruthy();

    fireEvent.click(screen.getByTestId('account-button'));
    const dialog = await screen.findByRole('dialog');

    expect(screen.queryByRole('button', { name: 'Add a place' })).toBeNull();

    fireEvent.click(dialog.querySelector('.modal-close-button'));

    expect(await screen.findByRole('button', { name: 'Add a place' })).toBeTruthy();
  });
});
