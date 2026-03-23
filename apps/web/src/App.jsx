import React from 'react';
import { buildKathmanduDemoData } from '@topey/shared/data/demoCatalog';
import { KATHMANDU_EXPLORE_REGION } from '@topey/shared/lib/constants';
import { getCommentsForPlace, getVoteBreakdown } from '@topey/shared/lib/geo';
import { colors } from '@topey/shared/lib/theme';

const demoData = buildKathmanduDemoData();
const bounds = {
  maxLatitude: KATHMANDU_EXPLORE_REGION.latitude + KATHMANDU_EXPLORE_REGION.latitudeDelta / 2,
  minLatitude: KATHMANDU_EXPLORE_REGION.latitude - KATHMANDU_EXPLORE_REGION.latitudeDelta / 2,
  minLongitude: KATHMANDU_EXPLORE_REGION.longitude - KATHMANDU_EXPLORE_REGION.longitudeDelta / 2,
  maxLongitude: KATHMANDU_EXPLORE_REGION.longitude + KATHMANDU_EXPLORE_REGION.longitudeDelta / 2,
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const KEYBOARD_ZOOM_STEP = 1.25;
const DOUBLE_CLICK_ZOOM_STEP = 1.4;
const WHEEL_ZOOM_SENSITIVITY = 0.0018;
const DEFAULT_VIEWPORT = {
  centerX: 0.5,
  centerY: 0.5,
  zoom: 1,
};

const projectedPlaces = demoData.places.map((place) => ({
  ...place,
  mapPoint: projectPlace(place),
}));

function projectPlace(place) {
  const x =
    (place.longitude - bounds.minLongitude) / (bounds.maxLongitude - bounds.minLongitude);
  const y = (bounds.maxLatitude - place.latitude) / (bounds.maxLatitude - bounds.minLatitude);

  return {
    x,
    y,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampViewport(viewport) {
  const zoom = clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM);
  const halfVisible = 0.5 / zoom;

  return {
    zoom,
    centerX: clamp(viewport.centerX, halfVisible, 1 - halfVisible),
    centerY: clamp(viewport.centerY, halfVisible, 1 - halfVisible),
  };
}

function moveViewport(viewport, deltaX, deltaY, size) {
  if (!size.width || !size.height) {
    return viewport;
  }

  return clampViewport({
    ...viewport,
    centerX: viewport.centerX + deltaX / (size.width * viewport.zoom),
    centerY: viewport.centerY + deltaY / (size.height * viewport.zoom),
  });
}

function zoomViewport(viewport, nextZoom, anchor) {
  const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const worldX = viewport.centerX + (anchor.x - 0.5) / viewport.zoom;
  const worldY = viewport.centerY + (anchor.y - 0.5) / viewport.zoom;

  return clampViewport({
    zoom: clampedZoom,
    centerX: worldX - (anchor.x - 0.5) / clampedZoom,
    centerY: worldY - (anchor.y - 0.5) / clampedZoom,
  });
}

function centerViewportOnPoint(viewport, point) {
  return clampViewport({
    ...viewport,
    centerX: point.x,
    centerY: point.y,
  });
}

function getMapTransform(viewport, size) {
  const width = size.width || 1;
  const height = size.height || 1;
  // The map world stays normalized to the Kathmandu bounding box while the viewport acts
  // like a camera that translates and scales that world for desktop interactions.
  const translateX = width / 2 - viewport.centerX * width * viewport.zoom;
  const translateY = height / 2 - viewport.centerY * height * viewport.zoom;

  return `translate3d(${translateX}px, ${translateY}px, 0) scale(${viewport.zoom})`;
}

function getPointerAnchor(event, boundsRect) {
  if (!boundsRect.width || !boundsRect.height) {
    return { x: 0.5, y: 0.5 };
  }

  return {
    x: clamp((event.clientX - boundsRect.left) / boundsRect.width, 0, 1),
    y: clamp((event.clientY - boundsRect.top) / boundsRect.height, 0, 1),
  };
}

function isTrackpadPan(event) {
  if (event.ctrlKey || event.metaKey) {
    return false;
  }

  const absX = Math.abs(event.deltaX);
  const absY = Math.abs(event.deltaY);
  // Precision trackpads emit small pixel deltas for two-finger pans; coarse wheel mice
  // produce larger step-like values that feel better when mapped to zoom instead.
  return event.deltaMode === 0 && (absX > 0 || absY < 80 || !Number.isInteger(event.deltaY));
}

function formatZoom(zoom) {
  return `${zoom.toFixed(2)}x`;
}

export default function App() {
  const helpId = React.useId();
  const mapSurfaceRef = React.useRef(null);
  const dragStateRef = React.useRef(null);
  const [selectedPlaceId, setSelectedPlaceId] = React.useState(projectedPlaces[0]?.id ?? '');
  const [viewport, setViewport] = React.useState(DEFAULT_VIEWPORT);
  const [viewportSize, setViewportSize] = React.useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = React.useState(false);

  const selectedIndex = projectedPlaces.findIndex((place) => place.id === selectedPlaceId);
  const selectedPlace = projectedPlaces[selectedIndex] ?? projectedPlaces[0] ?? null;
  const comments = React.useMemo(
    () => getCommentsForPlace(demoData.comments, selectedPlace?.id),
    [selectedPlace]
  );
  const voteBreakdown = React.useMemo(
    () => getVoteBreakdown(demoData.votes, selectedPlace?.id),
    [selectedPlace]
  );

  React.useEffect(() => {
    const mapNode = mapSurfaceRef.current;

    if (!mapNode) {
      return undefined;
    }

    const updateViewportSize = () => {
      const nextBounds = mapNode.getBoundingClientRect();
      setViewportSize((current) => {
        if (current.width === nextBounds.width && current.height === nextBounds.height) {
          return current;
        }

        return {
          width: nextBounds.width,
          height: nextBounds.height,
        };
      });
    };

    updateViewportSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateViewportSize);
      return () => window.removeEventListener('resize', updateViewportSize);
    }

    const resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(mapNode);

    return () => resizeObserver.disconnect();
  }, []);

  const selectPlace = React.useCallback((placeId, options = {}) => {
    const place = projectedPlaces.find((candidate) => candidate.id === placeId);

    if (!place) {
      return;
    }

    setSelectedPlaceId(placeId);

    if (options.recenter) {
      setViewport((current) => centerViewportOnPoint(current, place.mapPoint));
    }
  }, []);

  const changeSelection = React.useCallback(
    (direction) => {
      if (!projectedPlaces.length) {
        return;
      }

      const initialIndex = selectedIndex >= 0 ? selectedIndex : 0;
      const nextIndex =
        direction === 'forward'
          ? (initialIndex + 1) % projectedPlaces.length
          : (initialIndex - 1 + projectedPlaces.length) % projectedPlaces.length;

      selectPlace(projectedPlaces[nextIndex].id, { recenter: true });
    },
    [selectPlace, selectedIndex]
  );

  const centerOnSelectedPlace = React.useCallback(() => {
    if (!selectedPlace) {
      return;
    }

    setViewport((current) => centerViewportOnPoint(current, selectedPlace.mapPoint));
  }, [selectedPlace]);

  const resetViewport = React.useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
  }, []);

  const handleWheel = React.useCallback(
    (event) => {
      if (!mapSurfaceRef.current) {
        return;
      }

      event.preventDefault();
      const boundsRect = mapSurfaceRef.current.getBoundingClientRect();

      if (isTrackpadPan(event)) {
        const panX = Math.abs(event.deltaX) > 0 ? event.deltaX : event.shiftKey ? event.deltaY : 0;
        setViewport((current) => moveViewport(current, panX, event.deltaY, viewportSize));
        return;
      }

      const anchor = getPointerAnchor(event, boundsRect);
      setViewport((current) =>
        zoomViewport(
          current,
          current.zoom * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY),
          anchor
        )
      );
    },
    [viewportSize]
  );

  const handlePointerDown = React.useCallback((event) => {
    if (event.button !== 0 || event.target.closest('.place-dot')) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    dragStateRef.current = {
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      pointerId: event.pointerId,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = React.useCallback(
    (event) => {
      const dragState = dragStateRef.current;

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragState.lastClientX;
      const deltaY = event.clientY - dragState.lastClientY;

      dragStateRef.current = {
        ...dragState,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      };

      setViewport((current) => moveViewport(current, -deltaX, -deltaY, viewportSize));
    },
    [viewportSize]
  );

  const stopDragging = React.useCallback((event) => {
    const dragState = dragStateRef.current;

    if (dragState && dragState.pointerId === event.pointerId) {
      dragStateRef.current = null;
      setIsDragging(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = React.useCallback(
    (event) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          setViewport((current) => moveViewport(current, -96, 0, viewportSize));
          break;
        case 'ArrowRight':
          event.preventDefault();
          setViewport((current) => moveViewport(current, 96, 0, viewportSize));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setViewport((current) => moveViewport(current, 0, -96, viewportSize));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setViewport((current) => moveViewport(current, 0, 96, viewportSize));
          break;
        case '+':
        case '=':
          event.preventDefault();
          setViewport((current) => zoomViewport(current, current.zoom * KEYBOARD_ZOOM_STEP, { x: 0.5, y: 0.5 }));
          break;
        case '-':
        case '_':
          event.preventDefault();
          setViewport((current) => zoomViewport(current, current.zoom / KEYBOARD_ZOOM_STEP, { x: 0.5, y: 0.5 }));
          break;
        case '0':
          event.preventDefault();
          resetViewport();
          break;
        case 'Home':
          event.preventDefault();
          if (projectedPlaces[0]) {
            selectPlace(projectedPlaces[0].id, { recenter: true });
          }
          break;
        case 'End':
          event.preventDefault();
          if (projectedPlaces[projectedPlaces.length - 1]) {
            selectPlace(projectedPlaces[projectedPlaces.length - 1].id, { recenter: true });
          }
          break;
        case 'PageUp':
          event.preventDefault();
          changeSelection('backward');
          break;
        case 'PageDown':
          event.preventDefault();
          changeSelection('forward');
          break;
        default:
          break;
      }
    },
    [changeSelection, resetViewport, selectPlace, viewportSize]
  );

  const handleDoubleClick = React.useCallback((event) => {
    if (!mapSurfaceRef.current) {
      return;
    }

    event.preventDefault();
    const anchor = getPointerAnchor(event, mapSurfaceRef.current.getBoundingClientRect());
    setViewport((current) =>
      zoomViewport(current, current.zoom * DOUBLE_CLICK_ZOOM_STEP, anchor)
    );
  }, []);

  const mapTransform = React.useMemo(
    () => getMapTransform(viewport, viewportSize),
    [viewport, viewportSize]
  );

  return (
    <div
      className="app-shell"
      style={{
        '--color-background': colors.background,
        '--color-card': colors.card,
        '--color-elevated': colors.elevatedCard,
        '--color-border': colors.border,
        '--color-separator': colors.separator,
        '--color-text': colors.text,
        '--color-muted': colors.mutedText,
        '--color-primary': colors.primary,
        '--color-primary-text': colors.primaryText,
        '--color-accent': colors.accent,
      }}
    >
      <header className="topbar">
        <div>
          <div className="eyebrow">TOPEY WEB</div>
          <h1>Kathmandu place map</h1>
          <p>
            The monorepo now includes a dedicated browser app. Web focuses on browsing the live
            place field and inspecting details.
          </p>
        </div>
        <a
          className="topbar-link"
          href={selectedPlace ? openLocationHref(selectedPlace) : '#'}
          target="_blank"
          rel="noreferrer"
        >
          Open selected place
        </a>
      </header>

      <main className="layout">
        <section className="map-panel">
          <div className="map-chrome">
            <div className="map-chrome-meta">
              <span>Kathmandu</span>
              <span>{projectedPlaces.length} live drops</span>
              <span>Zoom {formatZoom(viewport.zoom)}</span>
            </div>
            <div className="map-chrome-actions">
              <button type="button" className="ghost-button" onClick={centerOnSelectedPlace}>
                Center selected
              </button>
              <button type="button" className="ghost-button" onClick={resetViewport}>
                Reset view
              </button>
            </div>
          </div>

          <div className="map-stage">
            <div className="map-help-card" id={helpId}>
              <div className="eyebrow">DESKTOP CONTROLS</div>
              <p>Drag or two-finger scroll to pan. Pinch, wheel, or double-click to zoom.</p>
              <p>Arrow keys pan. Page Up and Page Down change places. Press 0 to reset.</p>
            </div>

            <div
              ref={mapSurfaceRef}
              className={`map-surface${isDragging ? ' is-dragging' : ''}`}
              data-testid="map-surface"
              role="application"
              aria-label="Kathmandu place map"
              aria-describedby={helpId}
              aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight PageUp PageDown Home End + - 0"
              style={{ '--map-zoom': viewport.zoom }}
              tabIndex={0}
              onDoubleClick={handleDoubleClick}
              onKeyDown={handleKeyDown}
              onPointerCancel={stopDragging}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onWheel={handleWheel}
            >
              <div className="map-world" data-testid="map-world" style={{ transform: mapTransform }}>
                <div className="map-grid" />
                {projectedPlaces.map((place) => {
                  const isSelected = selectedPlace?.id === place.id;

                  return (
                    <button
                      key={place.id}
                      className={`place-dot${isSelected ? ' is-selected' : ''}`}
                      style={{
                        '--dot-scale': isSelected ? 1.3 : 1,
                        left: `${(place.mapPoint.x * 100).toFixed(2)}%`,
                        top: `${(place.mapPoint.y * 100).toFixed(2)}%`,
                      }}
                      type="button"
                      onClick={() => selectPlace(place.id)}
                      aria-label={`Open ${place.name}`}
                    />
                  );
                })}
              </div>

              <div className="map-overlay">
                <div className="map-overlay-chip">Selected: {selectedPlace?.name ?? 'None'}</div>
                <div className="map-overlay-chip">Home / End jumps across the dataset</div>
              </div>
            </div>
          </div>
        </section>

        <aside className="details-panel">
          {selectedPlace ? (
            <>
              <div className="panel-header">
                <div className="eyebrow">PLACE DETAILS</div>
                <h2>{selectedPlace.name}</h2>
                <p>{selectedPlace.description}</p>
              </div>

              <div className="meta-row">
                <span>
                  <strong>Rating</strong>
                  <em>
                    {voteBreakdown.score >= 0 ? `+${voteBreakdown.score}` : voteBreakdown.score}
                  </em>
                </span>
                <span>
                  <strong>Votes</strong>
                  <em>{voteBreakdown.ratioLabel}</em>
                </span>
                <span>
                  <strong>Threads</strong>
                  <em>{selectedPlace.threadCount ?? comments.length}</em>
                </span>
              </div>

              <div className="participation-row">
                <div className="vote-pill" aria-label="vote summary">
                  <span>↑</span>
                  <b>
                    {voteBreakdown.score >= 0 ? `+${voteBreakdown.score}` : voteBreakdown.score}
                  </b>
                  <span>↓</span>
                </div>
                <div className="added-by">
                  Added by: <span>{selectedPlace.authorName || 'Anonymous member'}</span>
                </div>
              </div>

              <div className="cta-row">
                <a
                  className="primary-link"
                  href={openLocationHref(selectedPlace)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open location
                </a>
                <span className="secondary-note">
                  Use mobile to add places, comment, and vote live.
                </span>
              </div>

              <div className="thread-card">
                <div className="thread-header">
                  <div className="eyebrow">THREAD PREVIEW</div>
                  <span className="thread-note">Web is browse-first today</span>
                </div>
                {comments.slice(0, 3).map((comment) => (
                  <article key={comment.id} className="comment-row">
                    <strong>{comment.authorName}</strong>
                    <p>{comment.body}</p>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

function openLocationHref(place) {
  return `https://www.google.com/maps?q=${place.latitude},${place.longitude}`;
}
