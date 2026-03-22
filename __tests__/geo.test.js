import { buildSeedState } from '../src/data/seed';
import { distanceInKm, getCommentsForPlace, getPlaceScore } from '../src/lib/geo';

describe('geo helpers', () => {
  test('place score adds up votes for a place', () => {
    const state = buildSeedState();
    const firstPlace = state.places[0];

    expect(getPlaceScore(state.votes, firstPlace.id)).toBeGreaterThanOrEqual(1);
  });

  test('comments are returned newest first for a place', () => {
    const state = buildSeedState();
    const firstPlace = state.places[0];
    const comments = getCommentsForPlace(state.comments, firstPlace.id);

    expect(comments.length).toBeGreaterThan(0);
    expect(comments[0].placeId).toBe(firstPlace.id);
    expect(new Date(comments[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(comments[comments.length - 1].createdAt).getTime()
    );
  });

  test('distance helper returns a positive number', () => {
    const state = buildSeedState();
    const from = { latitude: 27.7172, longitude: 85.324 };
    const to = state.places[0];

    expect(distanceInKm(from, to)).toBeGreaterThan(0);
  });
});
