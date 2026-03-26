import { getAnonymousHandle, normalizeAnonymousUsername } from '@topey/shared/lib/auth';
import { DEFAULT_PLACE_TAG, getPlaceTagLabel, normalizePlaceTag } from '@topey/shared/lib/placeTags';
import { supabase } from './supabase';

function normalizeText(value) {
  return value?.trim() ?? '';
}

function normalizeAnalyticsProperties(properties) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  );
}

function mapPlace(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    authorName: row.author_name,
    createdAt: row.created_at,
    createdBy: row.created_by,
    photoUrls: Array.isArray(row.photo_urls) ? row.photo_urls.filter(Boolean) : [],
    tag: getPlaceTagLabel(row.tag),
    threadCount: row.thread_count,
  };
}

function mapVote(row) {
  return {
    id: row.id,
    placeId: row.place_id,
    userId: row.user_id,
    value: row.value,
    createdAt: row.created_at,
  };
}

function mapComment(row) {
  return {
    id: row.id,
    placeId: row.place_id,
    parentCommentId: row.parent_comment_id,
    authorId: row.user_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapCommentVote(row) {
  return {
    id: row.id,
    commentId: row.comment_id,
    userId: row.user_id,
    value: row.value,
    createdAt: row.created_at,
  };
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing for the web app.');
  }

  return supabase;
}

function isHandleConflictError(error) {
  return /duplicate key value|unique constraint/i.test(String(error?.message ?? error ?? ''));
}

function createHandleTakenError(handle) {
  return new Error(`The anonymous name "${handle}" is already taken.`);
}

function shouldRetryPlaceInsertWithoutTag(error) {
  return /could not find the 'tag' column of 'places' in the schema cache|column ['"]?tag['"]? of relation ['"]?places['"]? does not exist/i.test(
    String(error?.message ?? error ?? '')
  );
}

async function getStoredAnonymousHandle(client, userId) {
  const result = await client.from('user_handles').select('handle').eq('user_id', userId).maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return normalizeAnonymousUsername(result.data?.handle ?? '');
}

async function getAuthorHandle(client, user) {
  const storedHandle = await getStoredAnonymousHandle(client, user.id);
  const fallbackHandle = getAnonymousHandle(user);
  const authorHandle = storedHandle || fallbackHandle;

  if (authorHandle.length < 3) {
    throw new Error('Choose an anonymous name before posting.');
  }

  return authorHandle;
}

async function writeVoteRecord(client, table, matchColumn, entityId, userId, value) {
  const existingResult = await client
    .from(table)
    .select('id, value')
    .eq(matchColumn, entityId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingResult.error) {
    throw existingResult.error;
  }

  if (existingResult.data?.value === value) {
    const { error } = await client.from(table).delete().eq('id', existingResult.data.id);

    if (error) {
      throw error;
    }

    return;
  }

  if (existingResult.data) {
    const { error } = await client
      .from(table)
      .update({ value })
      .eq('id', existingResult.data.id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await client.from(table).insert({
    [matchColumn]: entityId,
    user_id: userId,
    value,
  });

  if (error) {
    throw error;
  }
}

export async function fetchAppData() {
  const client = requireSupabase();
  const [placesResult, votesResult, commentsResult, commentVotesResult, savedResult] = await Promise.all([
    client.from('places').select('*').order('created_at', { ascending: false }),
    client.from('place_votes').select('*'),
    client.from('place_comments').select('*').order('created_at', { ascending: false }),
    client.from('place_comment_votes').select('*'),
    client.from('saved_places').select('*'),
  ]);

  if (placesResult.error) {
    throw placesResult.error;
  }

  if (votesResult.error) {
    throw votesResult.error;
  }

  if (commentsResult.error) {
    throw commentsResult.error;
  }

  if (commentVotesResult.error) {
    throw commentVotesResult.error;
  }

  if (savedResult.error) {
    throw savedResult.error;
  }

  return {
    places: placesResult.data.map(mapPlace),
    votes: votesResult.data.map(mapVote),
    comments: commentsResult.data.map(mapComment),
    commentVotes: commentVotesResult.data.map(mapCommentVote),
    savedPlaces: savedResult.data.map(row => ({
      id: row.id,
      userId: row.user_id,
      placeId: row.place_id,
      createdAt: row.created_at,
    })),
  };
}

export async function isAnonymousHandleAvailable(handle) {
  const client = requireSupabase();
  const normalizedHandle = normalizeAnonymousUsername(handle);

  if (normalizedHandle.length < 3) {
    throw new Error('Choose an anonymous name with at least 3 characters.');
  }

  const result = await client.from('user_handles').select('user_id').eq('handle', normalizedHandle).maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return !result.data;
}

export async function claimAnonymousHandle({ user, handle }) {
  const client = requireSupabase();
  const normalizedHandle = normalizeAnonymousUsername(handle);

  if (!user?.id) {
    throw new Error('Login required before choosing an anonymous name.');
  }

  if (normalizedHandle.length < 3) {
    throw new Error('Choose an anonymous name with at least 3 characters.');
  }

  const existingHandle = await getStoredAnonymousHandle(client, user.id);

  if (existingHandle === normalizedHandle) {
    return normalizedHandle;
  }

  if (existingHandle) {
    const { error } = await client
      .from('user_handles')
      .update({ handle: normalizedHandle })
      .eq('user_id', user.id);

    if (error) {
      if (isHandleConflictError(error)) {
        throw createHandleTakenError(normalizedHandle);
      }

      throw error;
    }
  } else {
    const { error } = await client.from('user_handles').insert({
      user_id: user.id,
      handle: normalizedHandle,
    });

    if (error) {
      if (isHandleConflictError(error)) {
        throw createHandleTakenError(normalizedHandle);
      }

      throw error;
    }
  }

  const metadataResult = await client.auth.updateUser({
    data: {
      preferred_username: normalizedHandle,
    },
  });

  if (metadataResult.error) {
    throw metadataResult.error;
  }

  return normalizedHandle;
}

export async function createPlace({ user, name, description, latitude, longitude, photoUrls = [], tag }) {
  const client = requireSupabase();
  const normalizedName = normalizeText(name);
  const normalizedDescription = normalizeText(description);
  const normalizedTag = normalizePlaceTag(tag);
  const normalizedPhotoUrls = Array.isArray(photoUrls)
    ? photoUrls.map((value) => normalizeText(value)).filter(Boolean)
    : [];

  if (!user?.id || !normalizedName || !normalizedDescription) {
    throw new Error('A logged-in user, place name, and description are required.');
  }

  const authorHandle = await getAuthorHandle(client, user);
  const basePayload = {
    name: normalizedName,
    description: normalizedDescription,
    latitude,
    longitude,
    created_by: user.id,
    author_name: authorHandle,
    photo_urls: normalizedPhotoUrls,
  };
  const taggedPayload =
    normalizedTag && normalizedTag !== DEFAULT_PLACE_TAG
      ? {
          ...basePayload,
          tag: normalizedTag,
        }
      : basePayload;

  let { error } = await client.from('places').insert(taggedPayload);
  let tagFallbackApplied = false;

  if (error && taggedPayload.tag && shouldRetryPlaceInsertWithoutTag(error)) {
    const retryResult = await client.from('places').insert(basePayload);
    error = retryResult.error;
    tagFallbackApplied = !retryResult.error;
  }

  if (error) {
    throw error;
  }

  return {
    tagFallbackApplied,
  };
}

export async function uploadPlacePhotos({ files, user }) {
  const client = requireSupabase();

  if (!user?.id) {
    throw new Error('Login required before uploading photos.');
  }

  const normalizedFiles = Array.from(files ?? []).filter(Boolean);

  if (!normalizedFiles.length) {
    return [];
  }

  const uploadResults = await Promise.all(
    normalizedFiles.map(async (file, index) => {
      if (!String(file.type ?? '').startsWith('image/')) {
        throw new Error('Only image uploads are supported.');
      }

      const extension = normalizeText(file.name).split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${user.id}/${Date.now()}-${index}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
      const uploadResult = await client.storage.from('place-photos').upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const publicUrlResult = client.storage.from('place-photos').getPublicUrl(filePath);
      return publicUrlResult.data.publicUrl;
    })
  );

  return uploadResults;
}

export async function deletePlace({ user, placeId }) {
  const client = requireSupabase();

  if (!user?.id || !placeId) {
    throw new Error('A logged-in user and place id are required.');
  }

  const { data, error } = await client
    .from('places')
    .delete()
    .eq('id', placeId)
    .eq('created_by', user.id)
    .select('id');

  if (error) {
    throw error;
  }

  if (!data?.length) {
    throw new Error('You can only delete places you created.');
  }
}

export async function savePlace({ user, placeId }) {
  const client = requireSupabase();

  if (!user?.id || !placeId) {
    throw new Error('A logged-in user and place id are required.');
  }

  const { error } = await client.from('saved_places').insert({ user_id: user.id, place_id: placeId });

  if (error) {
    throw error;
  }
}

export async function unsavePlace({ user, placeId }) {
  const client = requireSupabase();

  if (!user?.id || !placeId) {
    throw new Error('A logged-in user and place id are required.');
  }

  const { error } = await client.from('saved_places').delete().eq('user_id', user.id).eq('place_id', placeId);

  if (error) {
    throw error;
  }
}

export async function voteForPlace({ placeId, userId, value }) {
  const client = requireSupabase();
  await writeVoteRecord(client, 'place_votes', 'place_id', placeId, userId, value);
}

export async function createComment({ placeId, parentCommentId = null, user, body }) {
  const client = requireSupabase();
  const normalizedBody = normalizeText(body);

  if (!user?.id || !normalizedBody) {
    throw new Error('A logged-in user and non-empty comment are required.');
  }

  const authorHandle = await getAuthorHandle(client, user);
  const { error } = await client.from('place_comments').insert({
    place_id: placeId,
    parent_comment_id: parentCommentId,
    user_id: user.id,
    author_name: authorHandle,
    body: normalizedBody,
  });

  if (error) {
    throw error;
  }
}

export async function voteForComment({ commentId, userId, value }) {
  const client = requireSupabase();
  await writeVoteRecord(client, 'place_comment_votes', 'comment_id', commentId, userId, value);
}

export async function createPlaceOpenEvent({ placeId, userId = null, viewerSessionId, sourceScreen }) {
  const client = requireSupabase();
  const normalizedSource = normalizeText(sourceScreen) || 'unknown';

  if (!placeId || !viewerSessionId) {
    throw new Error('Place open tracking requires a place id and viewer session id.');
  }

  const { error } = await client.from('place_open_events').insert({
    place_id: placeId,
    user_id: userId,
    viewer_session_id: viewerSessionId,
    source_screen: normalizedSource,
  });

  if (error) {
    throw error;
  }
}

export async function createAnalyticsEvent({
  eventName,
  userId = null,
  viewerSessionId,
  pagePath,
  placeId = null,
  properties = {},
  sourceScreen,
}) {
  const client = requireSupabase();
  const normalizedEventName = normalizeText(eventName);
  const normalizedViewerSessionId = normalizeText(viewerSessionId);
  const normalizedPagePath = normalizeText(pagePath) || '/';
  const normalizedSourceScreen = normalizeText(sourceScreen) || 'unknown';

  if (!normalizedEventName || !normalizedViewerSessionId) {
    throw new Error('Analytics tracking requires an event name and viewer session id.');
  }

  const { error } = await client.from('analytics_events').insert({
    event_name: normalizedEventName,
    user_id: userId,
    viewer_session_id: normalizedViewerSessionId,
    page_path: normalizedPagePath,
    place_id: placeId,
    source_screen: normalizedSourceScreen,
    properties: normalizeAnalyticsProperties(properties),
  });

  if (error) {
    throw error;
  }
}
