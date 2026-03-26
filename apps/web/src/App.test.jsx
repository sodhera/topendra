import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const appData = {
  places: [
    {
      id: 'place-1',
      name: 'Shell Test Place',
      description: 'A routeable place from the live dataset.',
      tag: 'General',
      latitude: 27.7172,
      longitude: 85.324,
      authorName: 'quiet_reader',
      createdAt: '2026-03-23T00:00:00.000Z',
      createdBy: 'user-1',
      threadCount: 0,
    },
  ],
  votes: [
    {
      id: 'vote-1',
      placeId: 'place-1',
      userId: 'user-9',
      value: 1,
      createdAt: '2026-03-23T00:01:00.000Z',
    },
  ],
  comments: [],
  commentVotes: [],
};

vi.mock('./lib/backend', () => ({
  claimAnonymousHandle: vi.fn(async ({ handle }) => handle),
  createComment: vi.fn(),
  createPlace: vi.fn(),
  createPlaceOpenEvent: vi.fn(async () => undefined),
  fetchAppData: vi.fn(async () => appData),
  uploadPlacePhotos: vi.fn(async () => []),
  voteForComment: vi.fn(),
  voteForPlace: vi.fn(),
}));

vi.mock('./lib/supabase', () => ({
  getSafeSession: vi.fn().mockResolvedValue({
    session: null,
    recoveredFromInvalidToken: false,
  }),
  hasSupabaseConfig: true,
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  },
}));

vi.mock('./lib/analytics', () => ({
  captureAnalyticsEvent: vi.fn(),
  identifyAnalyticsUser: vi.fn(),
  initializeAnalytics: vi.fn(),
  resetAnalyticsUser: vi.fn(),
  setAnalyticsContext: vi.fn(),
}));

vi.mock('./components/DesktopMap', () => ({
  default: function DesktopMapMock({ addMode, colorMode, onSelectPlace }) {
    return (
      <div data-testid="desktop-map">
        <div data-testid="map-mode">{addMode ? 'add' : 'browse'}</div>
        <div data-testid="map-color-mode">{colorMode}</div>
        <button
          aria-label="Select first place"
          type="button"
          onClick={() =>
            onSelectPlace('place-1', {
              openModal: true,
              sourceScreen: 'test_marker',
            })
          }
        >
          Select first place
        </button>
      </div>
    );
  },
}));

describe('App web shell', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    window.localStorage.removeItem('zazaspot-color-mode');
  });

  it('renders the app-style home shell and opens a place page from the map', async () => {
    render(<App />);

    expect((await screen.findByTestId('account-button')).textContent).toBe('Sign in');
    expect(screen.getByTestId('tag-filter-button').textContent).toContain('Tags: All');
    expect(screen.getByTestId('theme-toggle-button')).toBeTruthy();
    expect(screen.getByTestId('feedback-button')).toBeTruthy();
    expect(screen.getByTestId('add-place-button').textContent).toBe('+');
    expect(screen.getByTestId('map-mode').textContent).toBe('browse');
    expect(screen.getByTestId('map-color-mode').textContent).toBe('light');

    fireEvent.click(screen.getByLabelText('Select first place'));

    const placePanel = await screen.findByLabelText('Place details panel');
    expect(await screen.findByRole('heading', { name: 'Shell Test Place' })).toBeTruthy();
    expect(screen.getByText('Open location')).toBeTruthy();
    expect(screen.getByText(/\+1 points/i)).toBeTruthy();
    expect(within(placePanel).getByText('General')).toBeTruthy();
    expect(window.location.pathname).toBe('/places/place-1');
    expect(screen.getByTestId('map-mode').textContent).toBe('browse');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches the shell and map into dark mode from the icon toggle', async () => {
    render(<App />);

    const toggleButton = await screen.findByTestId('theme-toggle-button');
    fireEvent.click(toggleButton);

    expect(screen.getByTestId('map-color-mode').textContent).toBe('dark');
    expect(window.localStorage.getItem('zazaspot-color-mode')).toBe('dark');
    expect(screen.getByLabelText('Switch to light mode')).toBeTruthy();
  });

  it('switches into add-place mode from the floating plus button', async () => {
    render(<App />);

    fireEvent.click(await screen.findByTestId('add-place-button'));

    expect(screen.getByTestId('map-mode').textContent).toBe('add');
    expect(screen.getByText('Back')).toBeTruthy();
    expect(screen.getByTestId('add-place-bottom-button')).toBeTruthy();
    expect(screen.queryByTestId('account-button')).toBeNull();
  });
});
