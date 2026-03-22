import { Linking, Platform } from 'react-native';

function encodeLabel(value) {
  return encodeURIComponent(value || 'Pinned place');
}

export function getPlaceMapUrls(place) {
  const latitude = place?.latitude;
  const longitude = place?.longitude;
  const label = encodeLabel(place?.name);
  const coordinates = `${latitude},${longitude}`;

  return {
    nativeUrl: Platform.select({
      ios: `http://maps.apple.com/?ll=${coordinates}&q=${label}`,
      android: `geo:${coordinates}?q=${coordinates}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${coordinates}`,
    }),
    fallbackUrl: `https://www.google.com/maps/search/?api=1&query=${coordinates}`,
  };
}

export async function openPlaceInMaps(place) {
  const { nativeUrl, fallbackUrl } = getPlaceMapUrls(place);

  try {
    const canOpenNative = await Linking.canOpenURL(nativeUrl);

    if (canOpenNative) {
      await Linking.openURL(nativeUrl);
      return;
    }
  } catch (error) {
    // Fall through to the web URL.
  }

  await Linking.openURL(fallbackUrl);
}
