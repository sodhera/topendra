import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { DEFAULT_REGION } from '@topey/shared/lib/constants';
import { createRegionFromLocation } from '@topey/shared/lib/geo';

export function useLiveLocation(options = {}) {
  const { watch = true } = options;
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [permissionStatus, setPermissionStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasResolvedInitialRegion, setHasResolvedInitialRegion] = useState(false);

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
          setHasResolvedInitialRegion(true);
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!active) {
          return;
        }

        setRegion(createRegionFromLocation(current.coords));
        setHasResolvedInitialRegion(true);

        if (watch) {
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
        }
      } catch (error) {
        if (active) {
          setPermissionStatus('error');
          setErrorMessage('Live location failed to load. Using Kathmandu as the fallback map center.');
          setHasResolvedInitialRegion(true);
        }
      }
    }

    start();

    return () => {
      active = false;
      watcher?.remove?.();
    };
  }, [watch]);

  return {
    region,
    permissionStatus,
    errorMessage,
    hasResolvedInitialRegion,
    setRegion,
  };
}
