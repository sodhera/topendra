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

function toRadians(value) {
  return (value * Math.PI) / 180;
}
