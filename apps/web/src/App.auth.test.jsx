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
};

const {
  authState,
  signInWithOAuth,
  signInWithPassword,
  signOut,
  signUp,
} = vi.hoisted(() => {
  const state = {
    callback: null,
    session: null,
  };

  return {
    authState: state,
    signInWithOAuth: vi.fn(async () => ({ error: null })),
    signInWithPassword: vi.fn(async ({ email, password }) => {
      state.session = {
        user: {
          id: 'user-123',
          email,
          user_metadata: {
            preferred_username: 'quiet_reader',
          },
        },
      };
      state.callback?.('SIGNED_IN', state.session);
      return { error: null };
    }),
    signUp: vi.fn(async ({ email, options }) => {
      state.session = {
        user: {
          id: 'user-signup',
          email,
          user_metadata: {
            preferred_username: options?.data?.preferred_username ?? 'new_user',
          },
        },
      };
      state.callback?.('SIGNED_IN', state.session);
      return { error: null };
    }),
    signOut: vi.fn(async () => {
      state.session = null;
      state.callback?.('SIGNED_OUT', null);
    }),
  };
});

vi.mock('./lib/backend', () => ({
  createComment: vi.fn(),
  createPlace: vi.fn(),
  createPlaceOpenEvent: vi.fn(),
  fetchAppData: vi.fn(async () => appData),
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
      signInWithPassword,
      signOut,
      signUp,
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
    authState.callback = null;
    authState.session = null;
    signInWithOAuth.mockClear();
    signInWithPassword.mockClear();
    signOut.mockClear();
    signUp.mockClear();
  });

  it('signs in with email/password and signs out from the profile modal', async () => {
    render(<App />);

    fireEvent.click(await screen.findByTestId('account-button'));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'testuser@topey.app' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'TopeyTest123!' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Profile');
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'testuser@topey.app',
      password: 'TopeyTest123!',
    });

    fireEvent.click(screen.getByTestId('account-button'));
    const profileDialog = await screen.findByRole('dialog');
    fireEvent.click(within(profileDialog).getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Sign in');
    });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('sends preferred_username during sign up and lands in the authenticated state', async () => {
    render(<App />);

    fireEvent.click(await screen.findByTestId('account-button'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Need an account? Sign up' }));

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'signup@topey.app' },
    });
    fireEvent.change(screen.getByPlaceholderText('Anonymous username'), {
      target: { value: 'Quiet Reader' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'TopeySignup123!' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByTestId('account-button').textContent).toBe('Profile');
    });

    expect(signUp).toHaveBeenCalledWith({
      email: 'signup@topey.app',
      password: 'TopeySignup123!',
      options: {
        data: {
          preferred_username: 'Quiet Reader',
        },
      },
    });
  });
});
