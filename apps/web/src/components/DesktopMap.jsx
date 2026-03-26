import React from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { DEFAULT_REGION, KATHMANDU_EXPLORE_REGION } from '@topey/shared/lib/constants';

const DEFAULT_ZOOM = 13;
const USER_LOCATION_ZOOM = 15;
const HIGH_DETAIL_TILE_ZOOM = 15;
const MAP_FLY_DURATION = 0.24;
const MAP_FLY_DURATION_SLOW = 0.3;
const CANVAS_RENDERER = L.canvas({ padding: 0.4 });
const TILE_KEEP_BUFFER = 4;
const HOVER_CARD_CLOSE_DELAY_MS = 120;
const TILE_URLS = Object.freeze({
  light: Object.freeze({
    standard: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
    retina: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png',
  }),
  dark: Object.freeze({
    standard: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
    retina: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
  }),
});
const PLACE_MARKER_RADIUS = 7;
const SELECTED_PLACE_MARKER_RADIUS = 10;
const ADD_MODE_PLACE_MARKER_RADIUS = 5;
const ADD_MODE_SELECTED_PLACE_MARKER_RADIUS = 7;
const USER_LOCATION_MARKER_RADIUS = 8;

function buildMarkerStyleSet(colorMode) {
  const borderColor = colorMode === 'dark' ? '#ddffd4' : '#111111';
  const centerFillColor = colorMode === 'dark' ? '#172118' : '#FFFFFF';

  return {
    addModePlace: Object.freeze({
      color: borderColor,
      fillColor: '#149647',
      fillOpacity: 0.34,
      opacity: 0.72,
      weight: 2,
    }),
    addModeSelectedPlace: Object.freeze({
      color: borderColor,
      fillColor: '#A7FF65',
      fillOpacity: 0.78,
      opacity: 0.92,
      weight: 3,
    }),
    place: Object.freeze({
      color: borderColor,
      fillColor: '#149647',
      fillOpacity: 1,
      opacity: 1,
      weight: 3,
    }),
    selectedPlace: Object.freeze({
      color: borderColor,
      fillColor: '#A7FF65',
      fillOpacity: 1,
      opacity: 1,
      weight: 3,
    }),
    userLocation: Object.freeze({
      color: borderColor,
      fillColor: centerFillColor,
      fillOpacity: 1,
      opacity: 1,
      weight: 3,
    }),
  };
}

function createAddPlaceMarkerIcon(colorMode) {
  const borderColor = colorMode === 'dark' ? '#ddffd4' : '#111111';
  const centerFillColor = colorMode === 'dark' ? '#172118' : '#FFFFFF';

  return L.divIcon({
    className: 'add-place-marker-shell',
    html: `
      <svg aria-hidden="true" class="add-place-marker-svg" viewBox="0 0 48 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 58C24 58 42 38.936 42 23.5C42 13.835 33.941 6 24 6C14.059 6 6 13.835 6 23.5C6 38.936 24 58 24 58Z" fill="#149647" stroke="${borderColor}" stroke-width="4"/>
        <circle cx="24" cy="24" r="7" fill="${centerFillColor}" stroke="${borderColor}" stroke-width="2"/>
      </svg>
    `,
    iconAnchor: [24, 58],
    iconSize: [48, 60],
  });
}

export function getBaseTileUrl({ colorMode = 'light', supportsHiDpiTiles = false, zoomLevel = DEFAULT_ZOOM }) {
  const tileSet = colorMode === 'dark' ? TILE_URLS.dark : TILE_URLS.light;

  return supportsHiDpiTiles && zoomLevel >= HIGH_DETAIL_TILE_ZOOM ? tileSet.retina : tileSet.standard;
}

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

function formatVoteScore(value) {
  return value >= 0 ? `+${value}` : `${value}`;
}

function MapRuntimeBridge({
  focusedPlace,
  onOpenSelected,
  onRegionChange,
  onSelectPlace,
  onZoomLevelChange,
  selectedPlaceId,
  userRegion,
  visiblePlaces,
}) {
  const map = useMap();
  const hasAppliedUserRegionRef = React.useRef(false);
  const lastFocusedPlaceIdRef = React.useRef('');
  const lastRegionRef = React.useRef(null);
  const lastZoomLevelRef = React.useRef(null);

  const emitRegion = React.useCallback(() => {
    const nextRegion = mapToRegion(map);

    if (areRegionsEquivalent(lastRegionRef.current, nextRegion)) {
      return;
    }

    lastRegionRef.current = nextRegion;
    onRegionChange(nextRegion);
  }, [map, onRegionChange]);

  const emitZoomLevel = React.useCallback(() => {
    const nextZoomLevel = map.getZoom();

    if (lastZoomLevelRef.current === nextZoomLevel) {
      return;
    }

    lastZoomLevelRef.current = nextZoomLevel;
    onZoomLevelChange(nextZoomLevel);
  }, [map, onZoomLevelChange]);

  useMapEvents({
    moveend() {
      emitRegion();
    },
    zoomend() {
      emitRegion();
      emitZoomLevel();
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
        emitZoomLevel();
        return;
      }

      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        map.invalidateSize({
          debounceMoveend: true,
          pan: false,
        });
        emitRegion();
        emitZoomLevel();
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
  }, [emitRegion, emitZoomLevel, map]);

  React.useEffect(() => {
    emitZoomLevel();
  }, [emitZoomLevel]);

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

const AddPlaceMarkerLayer = React.memo(function AddPlaceMarkerLayer({
  addMode,
  addPinCoordinates,
  addPlaceMarkerIcon,
  onAddPinChange,
}) {
  const eventHandlers = React.useMemo(
    () => ({
      dragend(event) {
        const nextLatLng = event.target.getLatLng();
        onAddPinChange({
          latitude: nextLatLng.lat,
          longitude: nextLatLng.lng,
        });
      },
    }),
    [onAddPinChange]
  );

  if (!addMode || !addPinCoordinates) {
    return null;
  }

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      icon={addPlaceMarkerIcon}
      keyboard
      position={[addPinCoordinates.latitude, addPinCoordinates.longitude]}
    />
  );
});

const PlaceMarkersLayer = React.memo(function PlaceMarkersLayer({
  addMode,
  baseMapReady,
  markerStyles,
  onSelectPlace,
  selectedPlaceId,
  visiblePlaces,
}) {
  const [hoveredPlaceId, setHoveredPlaceId] = React.useState('');
  const hoverCloseTimeoutRef = React.useRef(0);

  const clearHoverCloseTimeout = React.useCallback(() => {
    if (hoverCloseTimeoutRef.current) {
      window.clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = 0;
    }
  }, []);

  const openHoverCard = React.useCallback(
    (placeId) => {
      clearHoverCloseTimeout();
      setHoveredPlaceId(placeId);
    },
    [clearHoverCloseTimeout]
  );

  const scheduleHoverCardClose = React.useCallback(
    (placeId) => {
      clearHoverCloseTimeout();
      hoverCloseTimeoutRef.current = window.setTimeout(() => {
        setHoveredPlaceId((currentPlaceId) => (currentPlaceId === placeId ? '' : currentPlaceId));
      }, HOVER_CARD_CLOSE_DELAY_MS);
    },
    [clearHoverCloseTimeout]
  );

  React.useEffect(
    () => () => {
      clearHoverCloseTimeout();
    },
    [clearHoverCloseTimeout]
  );

  React.useEffect(() => {
    if (!baseMapReady || addMode) {
      setHoveredPlaceId('');
      clearHoverCloseTimeout();
    }
  }, [addMode, baseMapReady, clearHoverCloseTimeout]);

  if (!baseMapReady) {
    return null;
  }

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
        ? markerStyles.addModeSelectedPlace
        : markerStyles.addModePlace
      : isSelected
        ? markerStyles.selectedPlace
        : markerStyles.place;
    const eventHandlers = interactive
      ? {
          click: () => onSelectPlace(place.id),
          focus: () => openHoverCard(place.id),
          mouseover: () => openHoverCard(place.id),
          mouseout: () => scheduleHoverCardClose(place.id),
          touchstart: () => onSelectPlace(place.id),
          blur: () => scheduleHoverCardClose(place.id),
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
      >
        {interactive && hoveredPlaceId === place.id ? (
          <Tooltip
            className="place-hover-card"
            direction="top"
            eventHandlers={{
              blur: () => scheduleHoverCardClose(place.id),
              focus: () => openHoverCard(place.id),
              mouseout: () => scheduleHoverCardClose(place.id),
              mouseover: () => openHoverCard(place.id),
            }}
            interactive
            offset={[0, -14]}
            opacity={1}
            permanent
          >
            <div className="place-hover-card-title">{place.name}</div>
            <div className="place-hover-card-meta">
              <span>{formatVoteScore(place.voteBreakdown?.score ?? 0)} votes</span>
              <span>{place.voteBreakdown?.ratioLabel ?? '0:0'} ratio</span>
            </div>
            <button
              className="place-hover-card-button"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelectPlace(place.id);
              }}
            >
              Open
            </button>
          </Tooltip>
        ) : null}
      </CircleMarker>
    );
  });
});

const DesktopMap = React.memo(function DesktopMap({
  addMode,
  addPinCoordinates,
  colorMode = 'light',
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
  const supportsHiDpiTiles = React.useMemo(
    () => typeof window !== 'undefined' && window.devicePixelRatio > 1.25,
    []
  );
  const [zoomLevel, setZoomLevel] = React.useState(DEFAULT_ZOOM);
  const [baseMapReady, setBaseMapReady] = React.useState(false);
  const [loadedTileThemes, setLoadedTileThemes] = React.useState({
    dark: false,
    light: false,
  });
  const hasLoadedInitialBaseMapRef = React.useRef(false);
  const tileUrls = React.useMemo(
    () => ({
      dark: getBaseTileUrl({
        colorMode: 'dark',
        supportsHiDpiTiles,
        zoomLevel,
      }),
      light: getBaseTileUrl({
        colorMode: 'light',
        supportsHiDpiTiles,
        zoomLevel,
      }),
    }),
    [supportsHiDpiTiles, zoomLevel]
  );
  const markerStyles = React.useMemo(() => buildMarkerStyleSet(colorMode), [colorMode]);
  const addPlaceMarkerIcon = React.useMemo(() => createAddPlaceMarkerIcon(colorMode), [colorMode]);
  const markThemeLoaded = React.useCallback((theme) => {
    hasLoadedInitialBaseMapRef.current = true;
    setLoadedTileThemes((currentThemes) =>
      currentThemes[theme] ? currentThemes : { ...currentThemes, [theme]: true }
    );
    setBaseMapReady(true);
  }, []);
  const handleThemeLoading = React.useCallback(
    (theme) => {
      if (!hasLoadedInitialBaseMapRef.current && theme === colorMode) {
        setBaseMapReady(false);
      }
    },
    [colorMode]
  );

  React.useEffect(() => {
    if (loadedTileThemes[colorMode]) {
      setBaseMapReady(true);
    }
  }, [colorMode, loadedTileThemes]);
  const handleSelectPlace = React.useCallback(
    (placeId) => {
      onSelectPlace(placeId, {
        openModal: true,
        sourceScreen: 'web_home_pin_page',
      });
    },
    [onSelectPlace]
  );

  return (
    <div className="desktop-map-shell" data-testid="map-surface">
      <MapContainer
        center={initialCenter}
        className="leaflet-map"
        data-color-mode={colorMode}
        doubleClickZoom
        keyboard
        preferCanvas
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
      >
        {(['light', 'dark']).map((theme) => (
          <TileLayer
            key={theme}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            eventHandlers={{
              loading: () => handleThemeLoading(theme),
              load: () => markThemeLoaded(theme),
            }}
            keepBuffer={TILE_KEEP_BUFFER}
            opacity={colorMode === theme ? 1 : 0}
            subdomains="abcd"
            updateWhenIdle={false}
            updateWhenZooming={false}
            url={tileUrls[theme]}
            zIndex={colorMode === theme ? 1 : 0}
          />
        ))}

        <MapRuntimeBridge
          focusedPlace={focusedPlace}
          onOpenSelected={onOpenSelected}
          onRegionChange={onRegionChange}
          onSelectPlace={onSelectPlace}
          onZoomLevelChange={setZoomLevel}
          selectedPlaceId={selectedPlaceId}
          userRegion={userRegion}
          visiblePlaces={visiblePlaces}
        />

        <PlaceMarkersLayer
          addMode={addMode}
          baseMapReady={baseMapReady}
          markerStyles={markerStyles}
          onSelectPlace={handleSelectPlace}
          selectedPlaceId={selectedPlaceId}
          visiblePlaces={visiblePlaces}
        />

        <AddPlaceMarkerLayer
          addMode={addMode}
          addPinCoordinates={addPinCoordinates}
          addPlaceMarkerIcon={addPlaceMarkerIcon}
          onAddPinChange={onAddPinChange}
        />

        {userRegion && baseMapReady ? (
          <CircleMarker
            center={[userRegion.latitude, userRegion.longitude]}
            interactive={false}
            keyboard={false}
            pathOptions={markerStyles.userLocation}
            radius={USER_LOCATION_MARKER_RADIUS}
            renderer={CANVAS_RENDERER}
          />
        ) : null}
      </MapContainer>

      {!baseMapReady ? <div className="map-loading-indicator">Loading map…</div> : null}

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
