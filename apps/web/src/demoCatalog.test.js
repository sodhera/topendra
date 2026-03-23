import { describe, expect, it } from 'vitest';
import { buildKathmanduDemoData } from '@topey/shared/data/demoCatalog';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Kathmandu demo catalog ids', () => {
  it('uses deterministic UUID ids for places, votes, and comments', () => {
    const data = buildKathmanduDemoData(3);

    expect(data.places.map((place) => place.id)).toEqual([
      '00000000-0000-4000-8000-000000001001',
      '00000000-0000-4000-8000-000000001002',
      '00000000-0000-4000-8000-000000001003',
    ]);
    expect(data.places.every((place) => UUID_PATTERN.test(place.id))).toBe(true);
    expect(data.votes.every((vote) => UUID_PATTERN.test(vote.id) && UUID_PATTERN.test(vote.placeId))).toBe(
      true
    );
    expect(
      data.comments.every(
        (comment) => UUID_PATTERN.test(comment.id) && UUID_PATTERN.test(comment.placeId)
      )
    ).toBe(true);
  });
});
