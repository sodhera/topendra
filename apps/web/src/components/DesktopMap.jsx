import React from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { DEFAULT_REGION, KATHMANDU_EXPLORE_REGION } from '@topey/shared/lib/constants';

const DEFAULT_ZOOM = 13;
const USER_LOCATION_ZOOM = 15;
const ADD_PLACE_PIN_VERTICAL_FRACTION = 0.4;
const PLACE_MARKER_SIZE = 20;
const PLACE_MARKER_SELECTED_SIZE = 26;
const USER_LOCATION_MARKER_SIZE = 26;

function buildDivMarkerIcon({ className, containerClassName, size }) {
  return L.divIcon({
    className: `leaflet-div-icon ${containerClassName}`,
    html: `<span class="${className}" aria-hidden="true"></span>`,
    iconAnchor: [size / 2, size / 2],
    iconSize: [size, size],
  });
}

const PLACE_MARKER_ICON = buildDivMarkerIcon({
  className: 'web-place-marker',
  containerClassName: 'web-place-marker-icon',
  size: PLACE_MARKER_SIZE,
});
const SELECTED_PLACE_MARKER_ICON = buildDivMarkerIcon({
  className: 'web-place-marker is-selected',
  containerClassName: 'web-place-marker-icon',
  size: PLACE_MARKER_SELECTED_SIZE,
});
const USER_LOCATION_MARKER_ICON = buildDivMarkerIcon({
  className: 'web-user-location-marker',
  containerClassName: 'web-user-location-marker-icon',
  size: USER_LOCATION_MARKER_SIZE,
});

function mapToRegion(map) {
  const center = map.getCenter();
  const bounds = map.getBounds();

  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: Math.abs(bounds.getNorth() - bounds.getSouth()),
    longitudeDelta: Math.abs(bounds.getEast() - bounds.getWest()),
  };
}

function buildCenterPinCoordinates(map) {
  const size = map.getSize();
  const point = {
    x: size.x / 2,
    y: size.y * ADD_PLACE_PIN_VERTICAL_FRACTION,
  };
  const latLng = map.containerPointToLatLng(point);

  return {
    latitude: latLng.lat,
    longitude: latLng.lng,
  };
}

function MapRuntimeBridge({
  addMode,
  focusedPlace,
  onAddPinChange,
  onOpenSelected,
  onRegionChange,
  onSelectPlace,
  selectedPlaceId,
  userRegion,
  visiblePlaces,
}) {
  const map = useMapEvents({
    move() {
      if (addMode) {
        onAddPinChange(buildCenterPinCoordinates(map));
      }
    },
    moveend() {
      onRegionChange(mapToRegion(map));

      if (addMode) {
        onAddPinChange(buildCenterPinCoordinates(map));
      }
    },
    zoom() {
      if (addMode) {
        onAddPinChange(buildCenterPinCoordinates(map));
      }
    },
    zoomend() {
      onRegionChange(mapToRegion(map));

      if (addMode) {
        onAddPinChange(buildCenterPinCoordinates(map));
      }
    },
  });
  const hasAppliedUserRegionRef = React.useRef(false);
  const lastFocusedPlaceIdRef = React.useRef('');

  React.useEffect(() => {
    map.invalidateSize();
    onRegionChange(mapToRegion(map));
    onAddPinChange(buildCenterPinCoordinates(map));
  }, [map, onAddPinChange, onRegionChange]);

  React.useEffect(() => {
    if (!userRegion || hasAppliedUserRegionRef.current) {
      return;
    }

    hasAppliedUserRegionRef.current = true;
    map.flyTo(
      [userRegion.latitude, userRegion.longitude],
      Math.max(map.getZoom(), USER_LOCATION_ZOOM),
      {
        animate: true,
        duration: 0.45,
      }
    );
  }, [map, userRegion]);

  React.useEffect(() => {
    if (!focusedPlace || lastFocusedPlaceIdRef.current === focusedPlace.id) {
      return;
    }

    lastFocusedPlaceIdRef.current = focusedPlace.id;
    map.flyTo([focusedPlace.latitude, focusedPlace.longitude], Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.35,
    });
  }, [focusedPlace, map]);

  React.useEffect(() => {
    const container = map.getContainer();

    function handleKeyDown(event) {
      if (!visiblePlaces.length) {
        if (event.key === '0') {
          event.preventDefault();
          map.flyTo(
            [KATHMANDU_EXPLORE_REGION.latitude, KATHMANDU_EXPLORE_REGION.longitude],
            DEFAULT_ZOOM,
            { animate: true, duration: 0.35 }
          );
        }

        return;
      }

      const selectedIndex = visiblePlaces.findIndex((place) => place.id === selectedPlaceId);

      if (event.key === '0') {
        event.preventDefault();
        map.flyTo(
          [KATHMANDU_EXPLORE_REGION.latitude, KATHMANDU_EXPLORE_REGION.longitude],
          DEFAULT_ZOOM,
          { animate: true, duration: 0.35 }
        );
        return;
      }

      if (event.key === 'Enter' && selectedPlaceId) {
        event.preventDefault();
        onOpenSelected();
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        const firstPlace = visiblePlaces[0];

        if (firstPlace) {
          map.flyTo([firstPlace.latitude, firstPlace.longitude], Math.max(map.getZoom(), 15), {
            animate: true,
            duration: 0.35,
          });
          onSelectPlace(firstPlace.id, {
            openModal: false,
            sourceScreen: 'web_keyboard_selection',
          });
        }

        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        const lastPlace = visiblePlaces[visiblePlaces.length - 1];

        if (lastPlace) {
          map.flyTo([lastPlace.latitude, lastPlace.longitude], Math.max(map.getZoom(), 15), {
            animate: true,
            duration: 0.35,
          });
          onSelectPlace(lastPlace.id, {
            openModal: false,
            sourceScreen: 'web_keyboard_selection',
          });
        }

        return;
      }

      if (event.key !== 'PageUp' && event.key !== 'PageDown') {
        return;
      }

      event.preventDefault();
      const initialIndex = selectedIndex >= 0 ? selectedIndex : 0;
      const nextIndex =
        event.key === 'PageDown'
          ? (initialIndex + 1) % visiblePlaces.length
          : (initialIndex - 1 + visiblePlaces.length) % visiblePlaces.length;
      const nextPlace = visiblePlaces[nextIndex];

      if (!nextPlace) {
        return;
      }

      map.flyTo([nextPlace.latitude, nextPlace.longitude], Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.35,
      });
      onSelectPlace(nextPlace.id, {
        openModal: false,
        sourceScreen: 'web_keyboard_selection',
      });
    }

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [map, onOpenSelected, onSelectPlace, selectedPlaceId, visiblePlaces]);

  return null;
}

export default function DesktopMap({
  addMode,
  focusedPlace,
  onAddPinChange,
  onOpenSelected,
  onRegionChange,
  onSelectPlace,
  selectedPlaceId,
  userRegion,
  visiblePlaces,
}) {
  const initialCenter = React.useMemo(
    () => [DEFAULT_REGION.latitude, DEFAULT_REGION.longitude],
    []
  );

  return (
    <div className="desktop-map-shell" data-testid="map-surface">
      <MapContainer
        center={initialCenter}
        className="leaflet-map"
        doubleClickZoom
        keyboard
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        zoomDelta={0.5}
        zoomSnap={0.25}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRuntimeBridge
          addMode={addMode}
          focusedPlace={focusedPlace}
          onAddPinChange={onAddPinChange}
          onOpenSelected={onOpenSelected}
          onRegionChange={onRegionChange}
          onSelectPlace={onSelectPlace}
          selectedPlaceId={selectedPlaceId}
          userRegion={userRegion}
          visiblePlaces={visiblePlaces}
        />

        {visiblePlaces.map((place) => {
          const isSelected = place.id === selectedPlaceId;
          const center = [place.latitude, place.longitude];

          return (
            <Marker
              key={place.id}
              eventHandlers={{
                click: () =>
                  onSelectPlace(place.id, {
                    openModal: true,
                    sourceScreen: 'web_home_pin_modal',
                  }),
              }}
              icon={isSelected ? SELECTED_PLACE_MARKER_ICON : PLACE_MARKER_ICON}
              position={center}
              title={place.name}
            />
          );
        })}

        {userRegion ? (
          <Marker
            icon={USER_LOCATION_MARKER_ICON}
            interactive={false}
            keyboard={false}
            position={[userRegion.latitude, userRegion.longitude]}
          />
        ) : null}
      </MapContainer>

      <a
        className="map-attribution"
        href="https://www.openstreetmap.org/copyright"
        rel="noreferrer"
        target="_blank"
      >
        Map data © OpenStreetMap
      </a>
    </div>
  );
}
