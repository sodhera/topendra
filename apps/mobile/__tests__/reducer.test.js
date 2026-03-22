import { buildSeedState } from '@topey/shared/data/seed';
import { USER_IDS } from '@topey/shared/lib/constants';
import { reducer } from '../src/lib/reducer';

describe('app reducer', () => {
  test('adding a place prepends a valid place record', () => {
    const state = buildSeedState();
    const next = reducer(state, {
      type: 'add_place',
      payload: {
        name: 'New Spot',
        description: 'Tucked away balcony.',
        latitude: 27.7,
        longitude: 85.3,
        authorId: USER_IDS.GUEST,
      },
    });

    expect(next.places[0].name).toBe('New Spot');
    expect(next.places).toHaveLength(state.places.length + 1);
  });

  test('guest votes are ignored', () => {
    const state = buildSeedState();
    const next = reducer(state, {
      type: 'vote_place',
      payload: {
        placeId: state.places[0].id,
        userId: USER_IDS.GUEST,
        value: 1,
      },
    });

    expect(next.votes).toEqual(state.votes);
  });

  test('logged-in users can add comments', () => {
    const state = buildSeedState();
    const next = reducer(state, {
      type: 'add_comment',
      payload: {
        placeId: state.places[0].id,
        userId: USER_IDS.DEMO,
        body: 'Solid place.',
      },
    });

    expect(next.comments[0].body).toBe('Solid place.');
    expect(next.comments[0].authorId).toBe(USER_IDS.DEMO);
  });
});
