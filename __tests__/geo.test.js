import { buildSeedState } from '../src/data/seed';
import { distanceInKm, getCommentsForPlace, getPlaceScore } from '../src/lib/geo';

describe('geo helpers', () => {
  test('place score adds up votes for a place', () => {
    const state = buildSeedState();

    expect(getPlaceScore(state.votes, 'place-boudha-rooftop')).toBe(1);
  });

  test('comments are returned newest first for a place', () => {
    const state = buildSeedState();
    const comments = getCommentsForPlace(state.comments, 'place-boudha-rooftop');

    expect(comments[0].placeId).toBe('place-boudha-rooftop');
  });

  test('distance helper returns a positive number', () => {
    const state = buildSeedState();
    const from = { latitude: 27.7172, longitude: 85.324 };
    const to = state.places[0];

    expect(distanceInKm(from, to)).toBeGreaterThan(0);
  });
});
