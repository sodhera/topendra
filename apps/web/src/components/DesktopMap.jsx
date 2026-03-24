import React from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { DEFAULT_REGION, KATHMANDU_EXPLORE_REGION } from '@topey/shared/lib/constants';

const DEFAULT_ZOOM = 13;
const USER_LOCATION_ZOOM = 15;
const ADD_PLACE_PIN_VERTICAL_FRACTION = 0.4;
const MAP_FLY_DURATION = 0.24;
const MAP_FLY_DURATION_SLOW = 0.3;
const CANVAS_RENDERER = L.canvas({ padding: 0.4 });
const PLACE_MARKER_RADIUS = 7;
const SELECTED_PLACE_MARKER_RADIUS = 10;
const ADD_MODE_PLACE_MARKER_RADIUS = 5;
const ADD_MODE_SELECTED_PLACE_MARKER_RADIUS = 7;
const USER_LOCATION_MARKER_RADIUS = 8;
const PLACE_MARKER_STYLE = Object.freeze({
  color: '#FFFFFF',
  fillColor: '#FF4500',
  fillOpacity: 1,
  opacity: 1,
  weight: 2,
});
const SELECTED_PLACE_MARKER_STYLE = Object.freeze({
  color: '#1A1A1B',
  fillColor: '#FF4500',
  fillOpacity: 1,
  opacity: 1,
  weight: 3,
});
const ADD_MODE_PLACE_MARKER_STYLE = Object.freeze({
  color: '#FFFFFF',
  fillColor: '#FF4500',
  fillOpacity: 0.38,
  opacity: 0.42,
  weight: 1,
});
const ADD_MODE_SELECTED_PLACE_MARKER_STYLE = Object.freeze({
  color: '#1A1A1B',
  fillColor: '#FF4500',
  fillOpacity: 0.48,
  opacity: 0.58,
  weight: 2,
});
const USER_LOCATION_MARKER_STYLE = Object.freeze({
  color: '#FFFFFF',
  fillColor: '#0079D3',
  fillOpacity: 1,
  opacity: 1,
  weight: 3,
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

function areCoordinatesEquivalent(left, right) {
  if (!left || !right) {
    return false;
  }

  return (
    Math.abs(left.latitude - right.latitude) < 0.00001 &&
    Math.abs(left.longitude - right.longitude) < 0.00001
  );
}

function areRegionsEquivalent(left, right) {
  if (!left || !right) {
    return false;
  }

  return (
    Math.abs(left.latitude - right.latitude) < 0.00001 &&
    Math.abs(left.longitude - right.longitude) < 0.00001 &&
    Math.abs(left.latitudeDelta - right.latitudeDelta) < 0.00001 &&
    Math.abs(left.longitudeDelta - right.longitudeDelta) < 0.00001
  );
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
  const map = useMap();
  const hasAppliedUserRegionRef = React.useRef(false);
  const lastAddPinRef = React.useRef(null);
  const lastFocusedPlaceIdRef = React.useRef('');
  const lastRegionRef = React.useRef(null);

  const emitRegion = React.useCallback(() => {
    const nextRegion = mapToRegion(map);

    if (areRegionsEquivalent(lastRegionRef.current, nextRegion)) {
      return;
    }

    lastRegionRef.current = nextRegion;
    onRegionChange(nextRegion);
  }, [map, onRegionChange]);

  const emitAddPin = React.useCallback(() => {
    if (!addMode) {
      return;
    }

    const nextCoordinates = buildCenterPinCoordinates(map);

    if (areCoordinatesEquivalent(lastAddPinRef.current, nextCoordinates)) {
      return;
    }

    lastAddPinRef.current = nextCoordinates;
    onAddPinChange(nextCoordinates);
  }, [addMode, map, onAddPinChange]);

  useMapEvents({
    moveend() {
      emitRegion();
      emitAddPin();
    },
    zoomend() {
      emitRegion();
      emitAddPin();
    },
  });

  React.useEffect(() => {
    const container = map.getContainer();
    let frameId = 0;

    const refreshLayout = () => {
      if (typeof window === 'undefined') {
        map.invalidateSize({
          debounceMoveend: true,
          pan: false,
        });
        emitRegion();
        emitAddPin();
        return;
      }

      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        map.invalidateSize({
          debounceMoveend: true,
          pan: false,
        });
        emitRegion();
        emitAddPin();
      });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshLayout();
      }
    };

    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            refreshLayout();
          })
        : null;

    refreshLayout();
    resizeObserver?.observe(container);
    window.addEventListener('resize', refreshLayout);
    window.visualViewport?.addEventListener('resize', refreshLayout);
    window.visualViewport?.addEventListener('scroll', refreshLayout);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', refreshLayout);
      window.visualViewport?.removeEventListener('resize', refreshLayout);
      window.visualViewport?.removeEventListener('scroll', refreshLayout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [emitAddPin, emitRegion, map]);

  React.useEffect(() => {
    emitAddPin();
  }, [addMode, emitAddPin]);

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
        duration: MAP_FLY_DURATION_SLOW,
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
      duration: MAP_FLY_DURATION,
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
            { animate: true, duration: MAP_FLY_DURATION }
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
          { animate: true, duration: MAP_FLY_DURATION }
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
            duration: MAP_FLY_DURATION,
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
            duration: MAP_FLY_DURATION,
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
        duration: MAP_FLY_DURATION,
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

const PlaceMarkersLayer = React.memo(function PlaceMarkersLayer({
  addMode,
  onSelectPlace,
  selectedPlaceId,
  visiblePlaces,
}) {
  return visiblePlaces.map((place) => {
    const isSelected = place.id === selectedPlaceId;
    const interactive = !addMode;
    const radius = addMode
      ? isSelected
        ? ADD_MODE_SELECTED_PLACE_MARKER_RADIUS
        : ADD_MODE_PLACE_MARKER_RADIUS
      : isSelected
        ? SELECTED_PLACE_MARKER_RADIUS
        : PLACE_MARKER_RADIUS;
    const pathOptions = addMode
      ? isSelected
        ? ADD_MODE_SELECTED_PLACE_MARKER_STYLE
        : ADD_MODE_PLACE_MARKER_STYLE
      : isSelected
        ? SELECTED_PLACE_MARKER_STYLE
        : PLACE_MARKER_STYLE;
    const eventHandlers = interactive
      ? {
          click: () => onSelectPlace(place.id),
          touchstart: () => onSelectPlace(place.id),
        }
      : undefined;

    return (
      <CircleMarker
        bubblingMouseEvents={interactive}
        center={[place.latitude, place.longitude]}
        eventHandlers={eventHandlers}
        interactive={interactive}
        keyboard={interactive}
        key={place.id}
        pathOptions={pathOptions}
        radius={radius}
        renderer={CANVAS_RENDERER}
      />
    );
  });
});

const DesktopMap = React.memo(function DesktopMap({
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
  const handleSelectPlace = React.useCallback(
    (placeId) => {
      onSelectPlace(placeId, {
        openModal: true,
        sourceScreen: 'web_home_pin_modal',
      });
    },
    [onSelectPlace]
  );

  return (
    <div className="desktop-map-shell" data-testid="map-surface">
      <MapContainer
        center={initialCenter}
        className="leaflet-map"
        doubleClickZoom
        fadeAnimation={false}
        keyboard
        markerZoomAnimation={false}
        preferCanvas
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        zoomDelta={0.5}
        zoomSnap={0.25}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
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

        <PlaceMarkersLayer
          addMode={addMode}
          onSelectPlace={handleSelectPlace}
          selectedPlaceId={selectedPlaceId}
          visiblePlaces={visiblePlaces}
        />

        {userRegion ? (
          <CircleMarker
            center={[userRegion.latitude, userRegion.longitude]}
            interactive={false}
            keyboard={false}
            pathOptions={USER_LOCATION_MARKER_STYLE}
            radius={USER_LOCATION_MARKER_RADIUS}
            renderer={CANVAS_RENDERER}
          />
        ) : null}
      </MapContainer>

      <a
        className="map-attribution"
        href="https://carto.com/attributions"
        rel="noreferrer"
        target="_blank"
      >
        Map data © OpenStreetMap, © CARTO
      </a>
    </div>
  );
});

export default DesktopMap;
