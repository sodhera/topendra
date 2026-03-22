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
  const prioritizedPlaces = visiblePlaces
    .slice()
    .sort((left, right) => compareMapPlacePriority(left, right, scoreByPlaceId, selectedPlaceId));
  const cellsPerAxis = getBucketCountPerAxis(normalizedRegion);
  const latitudeStep = Math.max(normalizedRegion.latitudeDelta / cellsPerAxis, 0.0015);
  const longitudeStep = Math.max(normalizedRegion.longitudeDelta / cellsPerAxis, 0.0015);
  const placesByCell = new Map();

  for (const place of prioritizedPlaces) {
    const bucketKey = [
      Math.floor((place.latitude - bounds.minLatitude) / latitudeStep),
      Math.floor((place.longitude - bounds.minLongitude) / longitudeStep),
    ].join(':');

    if (!placesByCell.has(bucketKey)) {
      placesByCell.set(bucketKey, place);
    }
  }

  const maxMarkers = getMaxMarkerCount(normalizedRegion);
  const sampledPlaces = Array.from(placesByCell.values())
    .sort((left, right) => compareMapPlacePriority(left, right, scoreByPlaceId, selectedPlaceId))
    .slice(0, maxMarkers);

  if (selectedPlaceId) {
    const selectedPlace = visiblePlaces.find((place) => place.id === selectedPlaceId);

    if (selectedPlace && !sampledPlaces.some((place) => place.id === selectedPlaceId)) {
      sampledPlaces.pop();
      sampledPlaces.unshift(selectedPlace);
    }
  }

  return sampledPlaces;
}

function buildVoteScoreMap(votes) {
  const scoreByPlaceId = new Map();

  for (const vote of votes) {
    scoreByPlaceId.set(vote.placeId, (scoreByPlaceId.get(vote.placeId) ?? 0) + vote.value);
  }

  return scoreByPlaceId;
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

function getBucketCountPerAxis(region) {
  const widestDelta = Math.max(region.latitudeDelta, region.longitudeDelta);

  if (widestDelta <= 0.08) {
    return 16;
  }

  if (widestDelta <= 0.2) {
    return 12;
  }

  if (widestDelta <= 0.6) {
    return 10;
  }

  if (widestDelta <= 1.5) {
    return 8;
  }

  return 6;
}

function getMaxMarkerCount(region) {
  const widestDelta = Math.max(region.latitudeDelta, region.longitudeDelta);

  if (widestDelta <= 0.08) {
    return 48;
  }

  if (widestDelta <= 0.2) {
    return 36;
  }

  if (widestDelta <= 0.6) {
    return 24;
  }

  if (widestDelta <= 1.5) {
    return 16;
  }

  if (widestDelta <= 4) {
    return 10;
  }

  return 6;
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
