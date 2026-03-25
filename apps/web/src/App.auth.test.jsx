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
  signInWithOtp,
  signOut,
} = vi.hoisted(() => {
  const state = {
    callback: null,
    session: null,
  };

  return {
    authState: state,
    claimAnonymousHandle: vi.fn(async ({ handle }) => handle),
    signInWithOtp: vi.fn(async ({ email, options }) => {
      state.session = {
        user: {
          id: options?.data?.preferred_username ? 'user-signup' : 'user-123',
          email,
          user_metadata: options?.data ?? {},
        },
      };
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
      signInWithOtp,
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
    claimAnonymousHandle.mockClear();
    signInWithOtp.mockClear();
    signOut.mockClear();
  });

  it('requests an email sign-in link, lands in profile, and signs out', async () => {
    render(<App />);

    fireEvent.click(await screen.findByTestId('account-button'));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'testuser@topey.app' },
    });
    fireEvent.change(screen.getByPlaceholderText('Anonymous name (optional for returning users)'), {
      target: { value: 'quiet_reader' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Email me a sign-in link' }));

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Profile');
    });

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'testuser@topey.app',
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'http://localhost:3000/',
        data: {
          preferred_username: 'quiet_reader',
        },
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
    render(<App />);

    fireEvent.click(await screen.findByTestId('account-button'));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'signup@topey.app' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Email me a sign-in link' }));

    expect(
      await screen.findByRole('heading', { name: 'Choose your anonymous name' })
    ).toBeTruthy();

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
