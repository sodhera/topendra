import { EVIDENCE_TYPES, KATHMANDU_NEIGHBORHOODS } from './constants';

function clampCoord(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(4, Math.min(96, Math.round(value)));
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value || '')
    .split('\n')
    .map((item) => item.split(','))
    .flat()
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizePlaceFacts(rawFacts = {}) {
  const fallbackNeighborhood = KATHMANDU_NEIGHBORHOODS[0];
  const fallbackEvidenceType = EVIDENCE_TYPES[0].value;

  return {
    title: String(rawFacts.title || '').trim(),
    neighborhood: String(rawFacts.neighborhood || fallbackNeighborhood).trim(),
    summary: String(rawFacts.summary || '').trim(),
    bestTime: String(rawFacts.bestTime || '').trim(),
    allowedActions: splitList(rawFacts.allowedActions),
    restrictions: splitList(rawFacts.restrictions),
    evidenceType: String(rawFacts.evidenceType || fallbackEvidenceType),
    evidenceNote: String(rawFacts.evidenceNote || '').trim(),
    coords: {
      x: clampCoord(Number(rawFacts.coords?.x)),
      y: clampCoord(Number(rawFacts.coords?.y)),
    },
    photos: Array.isArray(rawFacts.photos) ? rawFacts.photos.filter(Boolean) : [],
  };
}

export function validatePlaceFacts(rawFacts, options = {}) {
  const { mode = 'submitted' } = options;
  const facts = normalizePlaceFacts(rawFacts);
  const errors = {};

  if (mode === 'draft') {
    if (facts.coords.x !== null && facts.coords.y === null) {
      errors.coords = 'Pin must include both X and Y coordinates.';
    }

    if (facts.coords.y !== null && facts.coords.x === null) {
      errors.coords = 'Pin must include both X and Y coordinates.';
    }

    return { facts, errors, isValid: Object.keys(errors).length === 0 };
  }

  if (!facts.title) {
    errors.title = 'Place name is required.';
  }

  if (!facts.neighborhood) {
    errors.neighborhood = 'Neighborhood is required.';
  }

  if (!facts.summary || facts.summary.length < 20) {
    errors.summary = 'Write a short note with at least 20 characters.';
  }

  if (!facts.bestTime) {
    errors.bestTime = 'Best time to go is required.';
  }

  if (facts.allowedActions.length === 0) {
    errors.allowedActions = 'List at least one allowed action.';
  }

  if (facts.restrictions.length === 0) {
    errors.restrictions = 'List at least one restriction.';
  }

  if (facts.coords.x === null || facts.coords.y === null) {
    errors.coords = 'Drop a specific pin on the map.';
  }

  if (!facts.evidenceNote) {
    errors.evidenceNote = 'Explain why this place should be trusted.';
  }

  return { facts, errors, isValid: Object.keys(errors).length === 0 };
}
