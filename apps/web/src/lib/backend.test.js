import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockClient, insert, maybeSingle } = vi.hoisted(() => {
  const insert = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn((table) => {
    if (table === 'user_handles') {
      return { select };
    }

    if (table === 'places') {
      return { insert };
    }

    throw new Error(`Unexpected table lookup: ${table}`);
  });

  return {
    insert,
    maybeSingle,
    mockClient: {
      from,
      auth: {
        updateUser: vi.fn(),
      },
    },
  };
});

vi.mock('./supabase', () => ({
  supabase: mockClient,
}));

import { createPlace } from './backend';

describe('createPlace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({
      data: {
        handle: 'quiet_reader',
      },
      error: null,
    });
  });

  it('allows place creation without a tag so mobile can use the database default', async () => {
    insert.mockResolvedValueOnce({ error: null });

    const result = await createPlace({
      user: { id: 'user-1' },
      name: ' Corner Cafe ',
      description: ' Late-night coffee and Wi-Fi. ',
      latitude: 27.7172,
      longitude: 85.324,
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      name: 'Corner Cafe',
      description: 'Late-night coffee and Wi-Fi.',
      latitude: 27.7172,
      longitude: 85.324,
      created_by: 'user-1',
      author_name: 'quiet_reader',
    });
    expect(result).toEqual({
      tagFallbackApplied: false,
    });
  });

  it('retries without the tag when Supabase schema cache is missing that column', async () => {
    insert
      .mockResolvedValueOnce({
        error: {
          message: "Could not find the 'tag' column of 'places' in the schema cache",
        },
      })
      .mockResolvedValueOnce({ error: null });

    const result = await createPlace({
      user: { id: 'user-1' },
      name: 'Corner Cafe',
      description: 'Late-night coffee and Wi-Fi.',
      latitude: 27.7172,
      longitude: 85.324,
      tag: 'Late night study',
    });

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenNthCalledWith(1, {
      name: 'Corner Cafe',
      description: 'Late-night coffee and Wi-Fi.',
      tag: 'Late night study',
      latitude: 27.7172,
      longitude: 85.324,
      created_by: 'user-1',
      author_name: 'quiet_reader',
    });
    expect(insert).toHaveBeenNthCalledWith(2, {
      name: 'Corner Cafe',
      description: 'Late-night coffee and Wi-Fi.',
      latitude: 27.7172,
      longitude: 85.324,
      created_by: 'user-1',
      author_name: 'quiet_reader',
    });
    expect(result).toEqual({
      tagFallbackApplied: true,
    });
  });
});
