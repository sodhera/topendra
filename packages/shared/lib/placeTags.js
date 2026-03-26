export const DEFAULT_PLACE_TAG = 'General';
export const PLACE_TAG_FILTER_ALL = '__all__';
export const PLACE_TAG_PRESET_OPTIONS = Object.freeze([
  {
    value: 'zaza_spot',
    label: 'Zaza spot',
  },
  {
    value: 'custom',
    label: 'Custom',
  },
]);

export function normalizePlaceTag(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getPlaceTagLabel(value) {
  return normalizePlaceTag(value) || DEFAULT_PLACE_TAG;
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
  if (!activeTagFilter || activeTagFilter === PLACE_TAG_FILTER_ALL) {
    return true;
  }

  return getPlaceTagLabel(placeTag).toLocaleLowerCase() === activeTagFilter.toLocaleLowerCase();
}
