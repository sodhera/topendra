import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

function extractScale(transform) {
  const match = transform.match(/scale\(([^)]+)\)/);
  return match ? Number(match[1]) : NaN;
}

describe('App web shell', () => {
  it('renders the app-style home map and opens a place sheet from a marker', async () => {
    render(<App />);

    expect((await screen.findByTestId('account-button')).textContent).toBe('Sign in');
    expect(screen.getByTestId('add-place-button').textContent).toBe('+');

    fireEvent.click(screen.getAllByLabelText('Open Thamel Courtyard')[0]);

    expect(await screen.findByRole('heading', { name: 'Thamel Courtyard' })).toBeTruthy();
    expect(screen.getByText('Open location')).toBeTruthy();
    expect(screen.getByText(/Added by:/)).toBeTruthy();
  });

  it('keeps desktop zoom and pan controls on the full-screen map', async () => {
    render(<App />);

    const mapSurface = await screen.findByTestId('map-surface');
    const mapWorld = screen.getByTestId('map-world');

    mapSurface.focus();
    fireEvent.keyDown(mapSurface, { key: '+' });
    expect(extractScale(mapWorld.style.transform)).toBe(1.25);

    const afterKeyboardZoom = mapWorld.style.transform;

    fireEvent.wheel(mapSurface, {
      deltaMode: 0,
      deltaX: 48,
      deltaY: 36,
      clientX: 480,
      clientY: 310,
    });

    expect(mapWorld.style.transform).not.toBe(afterKeyboardZoom);
    expect(extractScale(mapWorld.style.transform)).toBeCloseTo(1.25, 5);

    fireEvent.wheel(mapSurface, {
      ctrlKey: true,
      deltaMode: 0,
      deltaY: -120,
      clientX: 480,
      clientY: 310,
    });

    expect(extractScale(mapWorld.style.transform)).toBeGreaterThan(1.25);

    fireEvent.keyDown(mapSurface, { key: '0' });
    expect(extractScale(mapWorld.style.transform)).toBe(1);
  });
});
