import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockClient, deleteEqCreatedBy, deleteEqId, deleteSelect, insert, maybeSingle } = vi.hoisted(() => {
  const insert = vi.fn();
  const maybeSingle = vi.fn();
  const deleteSelect = vi.fn();
  const deleteEqCreatedBy = vi.fn(() => ({ select: deleteSelect }));
  const deleteEqId = vi.fn(() => ({ eq: deleteEqCreatedBy }));
  const deletePlaceRows = vi.fn(() => ({ eq: deleteEqId }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn((table) => {
    if (table === 'user_handles') {
      return { select };
    }

    if (table === 'places') {
      return {
        delete: deletePlaceRows,
        insert,
      };
    }

    if (table === 'analytics_events') {
      return { insert };
    }

    throw new Error(`Unexpected table lookup: ${table}`);
  });

  return {
    deleteEqCreatedBy,
    deleteEqId,
    deleteSelect,
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

import { createPlace, deletePlace } from './backend';
import { createAnalyticsEvent } from './backend';

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
      photo_urls: [],
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
      photo_urls: [],
    });
    expect(insert).toHaveBeenNthCalledWith(2, {
      name: 'Corner Cafe',
      description: 'Late-night coffee and Wi-Fi.',
      latitude: 27.7172,
      longitude: 85.324,
      created_by: 'user-1',
      author_name: 'quiet_reader',
      photo_urls: [],
    });
    expect(result).toEqual({
      tagFallbackApplied: true,
    });
  });
});

describe('deletePlace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a place when the authenticated user owns it', async () => {
    deleteSelect.mockResolvedValueOnce({
      data: [{ id: 'place-1' }],
      error: null,
    });

    await deletePlace({
      user: { id: 'user-1' },
      placeId: 'place-1',
    });

    expect(deleteEqId).toHaveBeenCalledWith('id', 'place-1');
    expect(deleteEqCreatedBy).toHaveBeenCalledWith('created_by', 'user-1');
    expect(deleteSelect).toHaveBeenCalledWith('id');
  });

  it('throws when no owned place row was deleted', async () => {
    deleteSelect.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await expect(
      deletePlace({
        user: { id: 'user-1' },
        placeId: 'place-1',
      })
    ).rejects.toThrow('You can only delete places you created.');
  });
});

describe('createAnalyticsEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes a normalized analytics row to Supabase', async () => {
    insert.mockResolvedValueOnce({ error: null });

    await createAnalyticsEvent({
      eventName: ' place created ',
      pagePath: ' /places/place-1 ',
      placeId: 'place-1',
      properties: {
        place_tag: 'Late night study',
        skipped: undefined,
      },
      sourceScreen: ' add_sheet ',
      userId: 'user-1',
      viewerSessionId: ' viewer-1 ',
    });

    expect(insert).toHaveBeenCalledWith({
      event_name: 'place created',
      page_path: '/places/place-1',
      place_id: 'place-1',
      properties: {
        place_tag: 'Late night study',
      },
      source_screen: 'add_sheet',
      user_id: 'user-1',
      viewer_session_id: 'viewer-1',
    });
  });
});
