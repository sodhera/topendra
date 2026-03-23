import { DEMO_PLACE_COUNT, buildKathmanduDemoData } from '@topey/shared/data/demoCatalog';
import { getUserIdentity } from '@topey/shared/lib/auth';
import { supabase } from './supabase';

const demoData = buildKathmanduDemoData();

function normalizeText(value) {
  return value?.trim() ?? '';
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

function sortByCreatedAtDescending(left, right) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function mergeById(primaryRecords, fallbackRecords) {
  const records = new Map();

  primaryRecords.forEach((record) => {
    records.set(record.id, record);
  });

  fallbackRecords.forEach((record) => {
    if (!records.has(record.id)) {
      records.set(record.id, record);
    }
  });

  return Array.from(records.values());
}

function attachDemoData(data) {
  const places = mergeById(data.places, demoData.places)
    .sort(sortByCreatedAtDescending)
    .slice(0, DEMO_PLACE_COUNT);
  const visiblePlaceIds = new Set(places.map((place) => place.id));
  const votes = mergeById(data.votes, demoData.votes).filter((vote) => visiblePlaceIds.has(vote.placeId));
  const comments = mergeById(data.comments, demoData.comments)
    .filter((comment) => visiblePlaceIds.has(comment.placeId))
    .sort(sortByCreatedAtDescending);

  return {
    places,
    votes,
    comments,
  };
}

export async function fetchAppData({ includeComments }) {
  const [placesResult, votesResult, commentsResult] = await Promise.all([
    supabase.from('places').select('*').order('created_at', { ascending: false }),
    supabase.from('place_votes').select('*'),
    includeComments
      ? supabase.from('place_comments').select('*').order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
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

  return attachDemoData({
    places: placesResult.data.map(mapPlace),
    votes: votesResult.data.map(mapVote),
    comments: commentsResult.data.map(mapComment),
  });
}

export async function createPlace({ user, name, description, latitude, longitude }) {
  const normalizedName = normalizeText(name);
  const normalizedDescription = normalizeText(description);

  if (!user?.id || !normalizedName || !normalizedDescription) {
    throw new Error('A logged-in user, place name, and description are required.');
  }

  const author = getUserIdentity(user);
  const { error } = await supabase.from('places').insert({
    name: normalizedName,
    description: normalizedDescription,
    latitude,
    longitude,
    created_by: user.id,
    author_name: author.name,
  });

  if (error) {
    throw error;
  }
}

export async function voteForPlace({ placeId, userId, value }) {
  const existingResult = await supabase
    .from('place_votes')
    .select('id, value')
    .eq('place_id', placeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingResult.error) {
    throw existingResult.error;
  }

  if (existingResult.data?.value === value) {
    const { error } = await supabase.from('place_votes').delete().eq('id', existingResult.data.id);

    if (error) {
      throw error;
    }

    return;
  }

  if (existingResult.data) {
    const { error } = await supabase
      .from('place_votes')
      .update({ value })
      .eq('id', existingResult.data.id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from('place_votes').insert({
    place_id: placeId,
    user_id: userId,
    value,
  });

  if (error) {
    throw error;
  }
}

export async function createComment({ placeId, parentCommentId = null, user, body }) {
  const normalizedBody = normalizeText(body);

  if (!user?.id || !normalizedBody) {
    throw new Error('A logged-in user and non-empty comment are required.');
  }

  const author = getUserIdentity(user);
  const { error } = await supabase.from('place_comments').insert({
    place_id: placeId,
    parent_comment_id: parentCommentId,
    user_id: user.id,
    author_name: author.name,
    body: normalizedBody,
  });

  if (error) {
    throw error;
  }
}

export async function createPlaceOpenEvent({ placeId, userId = null, viewerSessionId, sourceScreen }) {
  const normalizedSource = normalizeText(sourceScreen) || 'unknown';

  if (!placeId || !viewerSessionId) {
    throw new Error('Place open tracking requires a place id and viewer session id.');
  }

  const { error } = await supabase.from('place_open_events').insert({
    place_id: placeId,
    user_id: userId,
    viewer_session_id: viewerSessionId,
    source_screen: normalizedSource,
  });

  if (error) {
    throw error;
  }
}
