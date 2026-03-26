export const DEFAULT_PLACE_TAG = 'General';
export const PLACE_TAG_FILTER_ALL = '__all__';
export const PLACE_TAG_PRESET_OPTIONS = Object.freeze([
  {
    value: 'zaza_spots',
    label: 'Zaza Spots',
  },
  {
    value: 'zaza_friendly_restaurants',
    label: 'Zaza Friendly Restaurants',
  },
  {
    value: 'custom',
    label: 'Custom',
  },
]);
export const PLACE_TAG_FILTER_OPTIONS = Object.freeze(
  PLACE_TAG_PRESET_OPTIONS.filter((option) => option.value !== 'custom')
);

const TAG_LABEL_ALIASES = new Map([
  ['zaza spot', 'Zaza Spots'],
  ['zaza spots', 'Zaza Spots'],
  ['zazaspot', 'Zaza Spots'],
  ['zaza friendly restaurant', 'Zaza Friendly Restaurants'],
  ['zaza friendly restaurants', 'Zaza Friendly Restaurants'],
]);

export function normalizePlaceTag(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getPlaceTagLabel(value) {
  const normalizedValue = normalizePlaceTag(value);

  if (!normalizedValue) {
    return DEFAULT_PLACE_TAG;
  }

  return TAG_LABEL_ALIASES.get(normalizedValue.toLocaleLowerCase()) ?? normalizedValue;
}

export function isCustomPlaceTagOption(value) {
  return value === 'custom';
}

export function resolvePlaceTagValue({ customTag = '', selectedOption = PLACE_TAG_PRESET_OPTIONS[0].value }) {
  if (isCustomPlaceTagOption(selectedOption)) {
    return normalizePlaceTag(customTag);
  }

  return getPlaceTagPresetLabel(selectedOption);
}

export function getPlaceTagPresetLabel(selectedOption) {
  return (
    PLACE_TAG_PRESET_OPTIONS.find((option) => option.value === selectedOption)?.label ??
    DEFAULT_PLACE_TAG
  );
}

export function doesPlaceMatchTagFilter(placeTag, activeTagFilter) {
  const normalizedPlaceTag = getPlaceTagLabel(placeTag).toLocaleLowerCase();

  if (Array.isArray(activeTagFilter)) {
    const normalizedFilters = activeTagFilter
      .map((tag) => getPlaceTagLabel(tag).toLocaleLowerCase())
      .filter(Boolean);

    if (!normalizedFilters.length) {
      return true;
    }

    return normalizedFilters.includes(normalizedPlaceTag);
  }

  if (activeTagFilter instanceof Set) {
    if (!activeTagFilter.size) {
      return true;
    }

    return activeTagFilter.has(normalizedPlaceTag);
  }

  if (!activeTagFilter || activeTagFilter === PLACE_TAG_FILTER_ALL) {
    return true;
  }

  return normalizedPlaceTag === activeTagFilter.toLocaleLowerCase();
}
