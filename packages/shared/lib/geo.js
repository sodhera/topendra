import { DEFAULT_REGION } from './constants';

export function getPlaceScore(votes, placeId) {
  return votes
    .filter((vote) => vote.placeId === placeId)
    .reduce((sum, vote) => sum + vote.value, 0);
}

export function getVoteBreakdown(votes, placeId) {
  const matchingVotes = votes.filter((vote) => vote.placeId === placeId);
  const upvotes = matchingVotes.filter((vote) => vote.value > 0).length;
  const downvotes = matchingVotes.filter((vote) => vote.value < 0).length;

  return {
    upvotes,
    downvotes,
    score: upvotes - downvotes,
    ratioLabel: `${upvotes}:${downvotes}`,
  };
}

export function getCommentsForPlace(comments, placeId) {
  return comments
    .filter((comment) => comment.placeId === placeId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getCommentThreadsForPlace(comments, placeId) {
  const placeComments = getCommentsForPlace(comments, placeId);
  const commentNodes = new Map(
    placeComments.map((comment) => [
      comment.id,
      {
        ...comment,
        replies: [],
      },
    ])
  );
  const rootThreads = [];

  commentNodes.forEach((comment) => {
    if (comment.parentCommentId && commentNodes.has(comment.parentCommentId)) {
      commentNodes.get(comment.parentCommentId).replies.push(comment);
      return;
    }

    rootThreads.push(comment);
  });

  rootThreads.sort(sortCommentsByCreatedAtDescending);
  rootThreads.forEach(sortCommentRepliesByCreatedAtAscending);

  return rootThreads;
}

export function createRegionFromLocation(coords) {
  return {
    latitude: coords?.latitude ?? DEFAULT_REGION.latitude,
    longitude: coords?.longitude ?? DEFAULT_REGION.longitude,
    latitudeDelta: DEFAULT_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_REGION.longitudeDelta,
  };
}

export function distanceInKm(from, to) {
  if (!from || !to) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const startLat = toRadians(from.latitude);
  const endLat = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(startLat) * Math.cos(endLat);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function getNearestPlace(places, region) {
  if (!places?.length) {
    return null;
  }

  if (!region) {
    return places[0];
  }

  return places.reduce((nearestPlace, place) => {
    if (!nearestPlace) {
      return place;
    }

    return distanceInKm(region, place) < distanceInKm(region, nearestPlace) ? place : nearestPlace;
  }, null);
}

export function getMapPlacesForRegion(places, region, votes = [], selectedPlaceId = '') {
  if (!places?.length) {
    return [];
  }

  if (!region) {
    return places;
  }

  const normalizedRegion = {
    latitude: region.latitude ?? DEFAULT_REGION.latitude,
    longitude: region.longitude ?? DEFAULT_REGION.longitude,
    latitudeDelta: Math.max(region.latitudeDelta ?? DEFAULT_REGION.latitudeDelta, 0.0005),
    longitudeDelta: Math.max(region.longitudeDelta ?? DEFAULT_REGION.longitudeDelta, 0.0005),
  };
  const bounds = getPaddedRegionBounds(normalizedRegion, 0.18);
  const visiblePlaces = places.filter((place) => isPlaceInsideBounds(place, bounds));
  const scoreByPlaceId = buildVoteScoreMap(votes);
  return visiblePlaces
    .slice()
    .sort((left, right) => compareMapPlacePriority(left, right, scoreByPlaceId, selectedPlaceId));
}

function buildVoteScoreMap(votes) {
  const scoreByPlaceId = new Map();

  for (const vote of votes) {
    scoreByPlaceId.set(vote.placeId, (scoreByPlaceId.get(vote.placeId) ?? 0) + vote.value);
  }

  return scoreByPlaceId;
}

function sortCommentsByCreatedAtDescending(left, right) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function sortCommentsByCreatedAtAscending(left, right) {
  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

function sortCommentRepliesByCreatedAtAscending(comment) {
  comment.replies.sort(sortCommentsByCreatedAtAscending);
  comment.replies.forEach(sortCommentRepliesByCreatedAtAscending);
}

function getPaddedRegionBounds(region, paddingRatio) {
  const latitudePadding = region.latitudeDelta * paddingRatio;
  const longitudePadding = region.longitudeDelta * paddingRatio;

  return {
    minLatitude: region.latitude - region.latitudeDelta / 2 - latitudePadding,
    maxLatitude: region.latitude + region.latitudeDelta / 2 + latitudePadding,
    minLongitude: region.longitude - region.longitudeDelta / 2 - longitudePadding,
    maxLongitude: region.longitude + region.longitudeDelta / 2 + longitudePadding,
  };
}

function isPlaceInsideBounds(place, bounds) {
  return (
    place.latitude >= bounds.minLatitude &&
    place.latitude <= bounds.maxLatitude &&
    place.longitude >= bounds.minLongitude &&
    place.longitude <= bounds.maxLongitude
  );
}

function compareMapPlacePriority(left, right, scoreByPlaceId, selectedPlaceId) {
  return getMapPlacePriority(right, scoreByPlaceId, selectedPlaceId) - getMapPlacePriority(left, scoreByPlaceId, selectedPlaceId);
}

function getMapPlacePriority(place, scoreByPlaceId, selectedPlaceId) {
  const createdAtScore = place.createdAt ? new Date(place.createdAt).getTime() / 1e12 : 0;

  return (
    (place.id === selectedPlaceId ? 1000000 : 0) +
    ((place.threadCount ?? 0) * 100) +
    ((scoreByPlaceId.get(place.id) ?? 0) * 10) +
    createdAtScore
  );
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
