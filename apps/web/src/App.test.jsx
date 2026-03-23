import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

function extractScale(transform) {
  const match = transform.match(/scale\(([^)]+)\)/);
  return match ? Number(match[1]) : NaN;
}

describe('App desktop controls', () => {
  it('supports keyboard zooming, panning, and place navigation', () => {
    render(<App />);

    const mapSurface = screen.getByTestId('map-surface');
    const mapWorld = screen.getByTestId('map-world');
    const detailsHeading = screen.getByRole('heading', { level: 2 });

    expect(detailsHeading.textContent).toBe('Thamel Courtyard');
    expect(extractScale(mapWorld.style.transform)).toBe(1);

    mapSurface.focus();
    fireEvent.keyDown(mapSurface, { key: '+' });
    const afterZoom = mapWorld.style.transform;
    expect(extractScale(afterZoom)).toBe(1.25);

    fireEvent.keyDown(mapSurface, { key: 'ArrowRight' });
    expect(mapWorld.style.transform).not.toBe(afterZoom);
    expect(extractScale(mapWorld.style.transform)).toBe(1.25);

    fireEvent.keyDown(mapSurface, { key: 'PageDown' });
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Lazimpat Cafe Corner');

    fireEvent.keyDown(mapSurface, { key: '0' });
    expect(extractScale(mapWorld.style.transform)).toBe(1);
  });

  it('treats trackpad scroll as pan and ctrl+wheel as zoom', () => {
    render(<App />);

    const mapSurface = screen.getByTestId('map-surface');
    const mapWorld = screen.getByTestId('map-world');

    fireEvent.wheel(mapSurface, {
      ctrlKey: true,
      deltaMode: 0,
      deltaY: -120,
      clientX: 480,
      clientY: 310,
    });

    const afterCtrlZoom = mapWorld.style.transform;
    expect(extractScale(afterCtrlZoom)).toBeGreaterThan(1);

    fireEvent.wheel(mapSurface, {
      deltaMode: 0,
      deltaX: 48,
      deltaY: 36,
      clientX: 480,
      clientY: 310,
    });

    expect(mapWorld.style.transform).not.toBe(afterCtrlZoom);
    expect(extractScale(mapWorld.style.transform)).toBeCloseTo(extractScale(afterCtrlZoom), 5);
  });
});
