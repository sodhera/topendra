import { buildSeedState } from '@topey/shared/data/seed';
import { distanceInKm, getCommentsForPlace, getMapPlacesForRegion, getPlaceScore } from '@topey/shared/lib/geo';

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

  test('map place selection reduces marker density as the viewport zooms out', () => {
    const state = buildSeedState();
    const closeRegion = {
      latitude: 27.7172,
      longitude: 85.324,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
    const farRegion = {
      latitude: 27.7172,
      longitude: 85.324,
      latitudeDelta: 8,
      longitudeDelta: 8,
    };
    const closePlaces = getMapPlacesForRegion(state.places, closeRegion, state.votes);
    const farPlaces = getMapPlacesForRegion(state.places, farRegion, state.votes);

    expect(closePlaces.length).toBeGreaterThan(farPlaces.length);
    expect(farPlaces.length).toBeLessThanOrEqual(6);
  });

  test('map place selection keeps the selected place visible when zoomed out', () => {
    const state = buildSeedState();
    const farRegion = {
      latitude: 27.7172,
      longitude: 85.324,
      latitudeDelta: 8,
      longitudeDelta: 8,
    };
    const selectedPlaceId = state.places[0].id;
    const visiblePlaces = getMapPlacesForRegion(state.places, farRegion, state.votes, selectedPlaceId);

    expect(visiblePlaces.some((place) => place.id === selectedPlaceId)).toBe(true);
  });
});
