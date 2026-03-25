import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./lib/supabase', () => ({
  getSafeSession: vi.fn().mockResolvedValue({
    session: null,
    recoveredFromInvalidToken: false,
  }),
  hasSupabaseConfig: false,
  supabase: null,
}));

vi.mock('./components/DesktopMap', () => ({
  default: function DesktopMapMock({ addMode, onSelectPlace }) {
    return (
      <div data-testid="desktop-map">
        <div data-testid="map-mode">{addMode ? 'add' : 'browse'}</div>
        <button
          aria-label="Select first place"
          type="button"
          onClick={() =>
            onSelectPlace('00000000-0000-4000-8000-000000001001', {
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
  });

  it('renders the app-style home shell and opens a place page from the map', async () => {
    render(<App />);

    expect((await screen.findByTestId('account-button')).textContent).toBe('Sign in');
    expect(screen.getByTestId('add-place-button').textContent).toBe('+');
    expect(screen.getByTestId('map-mode').textContent).toBe('browse');

    fireEvent.click(screen.getByLabelText('Select first place'));

    expect(await screen.findByRole('heading', { name: 'Thamel Courtyard' })).toBeTruthy();
    expect(screen.getByText('Open location')).toBeTruthy();
    expect(screen.getByText(/Added by:/)).toBeTruthy();
    expect(window.location.pathname).toBe('/places/00000000-0000-4000-8000-000000001001');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches into add-place mode from the floating plus button', async () => {
    render(<App />);

    fireEvent.click(await screen.findByTestId('add-place-button'));

    expect(screen.getByTestId('map-mode').textContent).toBe('add');
    expect(screen.getByText('Back')).toBeTruthy();
    expect(screen.getByText('Add here')).toBeTruthy();
  });
});
