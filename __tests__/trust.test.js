import { buildSeedState } from '../src/data/seed';
import { computePlaceConfidence, getTrustSignalsForUser } from '../src/lib/trust';

describe('trust scoring', () => {
  test('operator-confirmed places score higher than stale low-proof places', () => {
    const state = buildSeedState();
    const strongPlace = state.places.find((place) => place.id === 'place-lazimpat-lantern');
    const weakerPlace = state.places.find((place) => place.id === 'place-bhaktapur-window');

    expect(computePlaceConfidence(state, strongPlace)).toBeGreaterThan(
      computePlaceConfidence(state, weakerPlace)
    );
  });

  test('trusted users accumulate more signals than guests', () => {
    const state = buildSeedState();

    expect(getTrustSignalsForUser(state, 'sagar')).toBeGreaterThan(getTrustSignalsForUser(state, 'anon'));
  });
});
