import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { DEFAULT_REGION } from '../lib/constants';
import { createRegionFromLocation } from '../lib/geo';

export function useLiveLocation() {
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [permissionStatus, setPermissionStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let watcher;
    let active = true;

    async function start() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (!active) {
          return;
        }

        setPermissionStatus(status);

        if (status !== 'granted') {
          setErrorMessage('Location permission is off. The map is centered on Kathmandu until you allow access.');
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!active) {
          return;
        }

        setRegion(createRegionFromLocation(current.coords));

        watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 20,
          },
          (nextLocation) => {
            if (active) {
              setRegion(createRegionFromLocation(nextLocation.coords));
            }
          }
        );
      } catch (error) {
        if (active) {
          setPermissionStatus('error');
          setErrorMessage('Live location failed to load. Using Kathmandu as the fallback map center.');
        }
      }
    }

    start();

    return () => {
      active = false;
      watcher?.remove?.();
    };
  }, []);

  return {
    region,
    permissionStatus,
    errorMessage,
    setRegion,
  };
}
