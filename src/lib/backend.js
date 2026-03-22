import { getUserIdentity } from './auth';
import { supabase } from './supabase';

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
    authorId: row.user_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
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

  return {
    places: placesResult.data.map(mapPlace),
    votes: votesResult.data.map(mapVote),
    comments: commentsResult.data.map(mapComment),
  };
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

export async function createComment({ placeId, user, body }) {
  const normalizedBody = normalizeText(body);

  if (!user?.id || !normalizedBody) {
    throw new Error('A logged-in user and non-empty comment are required.');
  }

  const author = getUserIdentity(user);
  const { error } = await supabase.from('place_comments').insert({
    place_id: placeId,
    user_id: user.id,
    author_name: author.name,
    body: normalizedBody,
  });

  if (error) {
    throw error;
  }
}
