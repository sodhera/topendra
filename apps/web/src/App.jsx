import React from 'react';
import { buildKathmanduDemoData } from '@topey/shared/data/demoCatalog';
import {
  getUserIdentity,
  isLoggedIn,
  normalizeAnonymousUsername,
} from '@topey/shared/lib/auth';
import {
  DEFAULT_REGION,
  KATHMANDU_EXPLORE_REGION,
  VIEWER_SESSION_KEY,
} from '@topey/shared/lib/constants';
import {
  createRegionFromLocation,
  getCommentsForPlace,
  getMapPlacesForRegion,
  getVoteBreakdown,
} from '@topey/shared/lib/geo';
import { colors } from '@topey/shared/lib/theme';
import {
  createComment,
  createPlace,
  createPlaceOpenEvent,
  fetchAppData,
  voteForPlace,
} from './lib/backend';
import { getSafeSession, hasSupabaseConfig, supabase } from './lib/supabase';

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
const ADD_PLACE_PIN_VERTICAL_FRACTION = 0.4;
const DEFAULT_VIEWPORT = {
  centerX: 0.5,
  centerY: 0.5,
  zoom: 1,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function projectCoordinates(latitude, longitude) {
  const x = (longitude - bounds.minLongitude) / (bounds.maxLongitude - bounds.minLongitude);
  const y = (bounds.maxLatitude - latitude) / (bounds.maxLatitude - bounds.minLatitude);

  return {
    x,
    y,
  };
}

function viewportPointToCoordinates(viewport, anchor) {
  const point = {
    x: viewport.centerX + (anchor.x - 0.5) / viewport.zoom,
    y: viewport.centerY + (anchor.y - 0.5) / viewport.zoom,
  };

  return {
    latitude:
      bounds.maxLatitude - point.y * (bounds.maxLatitude - bounds.minLatitude),
    longitude:
      bounds.minLongitude + point.x * (bounds.maxLongitude - bounds.minLongitude),
  };
}

function viewportToRegion(viewport) {
  const center = viewportPointToCoordinates(viewport, { x: 0.5, y: 0.5 });

  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: KATHMANDU_EXPLORE_REGION.latitudeDelta / viewport.zoom,
    longitudeDelta: KATHMANDU_EXPLORE_REGION.longitudeDelta / viewport.zoom,
  };
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
  // The map world stays normalized to Kathmandu bounds while the viewport acts
  // like the camera shared by mouse, trackpad, and keyboard interactions.
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
  // Precision trackpads emit smaller pixel deltas; treat those as panning so
  // desktop scrolling feels like a real map instead of a synthetic zoom wheel.
  return event.deltaMode === 0 && (absX > 0 || absY < 80 || !Number.isInteger(event.deltaY));
}

function createViewerSessionId() {
  return `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateViewerSessionId() {
  const existingId = window.localStorage.getItem(VIEWER_SESSION_KEY);

  if (existingId) {
    return existingId;
  }

  const nextId = createViewerSessionId();
  window.localStorage.setItem(VIEWER_SESSION_KEY, nextId);
  return nextId;
}

function openLocationHref(place) {
  const coordinates = `${place.latitude},${place.longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${coordinates}`;
}

export default function App() {
  const helpId = React.useId();
  const mapSurfaceRef = React.useRef(null);
  const dragStateRef = React.useRef(null);
  const [session, setSession] = React.useState(null);
  const [viewerSessionId, setViewerSessionId] = React.useState('');
  const [places, setPlaces] = React.useState(demoData.places);
  const [votes, setVotes] = React.useState(demoData.votes);
  const [allComments, setAllComments] = React.useState(demoData.comments);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isAuthBusy, setIsAuthBusy] = React.useState(false);
  const [authNoticeMessage, setAuthNoticeMessage] = React.useState(
    hasSupabaseConfig ? '' : 'Web is using demo data until Supabase is configured.'
  );
  const [errorMessage, setErrorMessage] = React.useState('');
  const [selectedPlaceId, setSelectedPlaceId] = React.useState('');
  const [isPlaceModalVisible, setIsPlaceModalVisible] = React.useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = React.useState(false);
  const [isDiscussionModalVisible, setIsDiscussionModalVisible] = React.useState(false);
  const [isComposerModalVisible, setIsComposerModalVisible] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [replyTarget, setReplyTarget] = React.useState(null);
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);
  const [commentVotes, setCommentVotes] = React.useState({});
  const [viewport, setViewport] = React.useState(DEFAULT_VIEWPORT);
  const [viewportSize, setViewportSize] = React.useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [hasCenteredMap, setHasCenteredMap] = React.useState(false);
  const [isAddMode, setIsAddMode] = React.useState(false);
  const [isAddSheetVisible, setIsAddSheetVisible] = React.useState(false);
  const [newPlaceName, setNewPlaceName] = React.useState('');
  const [newPlaceDescription, setNewPlaceDescription] = React.useState('');
  const [isSavingPlace, setIsSavingPlace] = React.useState(false);

  const currentUser = React.useMemo(() => getUserIdentity(session?.user), [session]);
  const isAuthenticated = isLoggedIn(session);

  const refreshData = React.useCallback(async (activeSession) => {
    try {
      const nextData = hasSupabaseConfig
        ? await fetchAppData({
            includeComments: Boolean(activeSession?.user),
          })
        : demoData;

      setPlaces(nextData.places);
      setVotes(nextData.votes);
      setAllComments(nextData.comments);

      if (hasSupabaseConfig) {
        setErrorMessage('');
      }

      return nextData;
    } catch (error) {
      setPlaces(demoData.places);
      setVotes(demoData.votes);
      setAllComments(demoData.comments);
      setErrorMessage(error?.message ?? 'Topey could not reach Supabase right now.');
      return demoData;
    }
  }, []);

  React.useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const nextViewerSessionId = getOrCreateViewerSessionId();
        const { session: safeSession } = hasSupabaseConfig
          ? await getSafeSession()
          : { session: null };

        if (!active) {
          return;
        }

        setViewerSessionId(nextViewerSessionId);
        setSession(safeSession ?? null);
        await refreshData(safeSession ?? null);
      } catch (error) {
        if (active) {
          setErrorMessage(error?.message ?? 'Topey could not restore the saved session.');
        }
      } finally {
        if (active) {
          setIsHydrated(true);
        }
      }
    }

    bootstrap();

    if (!supabase) {
      return () => {
        active = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession ?? null);
      if (nextSession?.user) {
        setIsAuthModalVisible(false);
        setAuthNoticeMessage('');
      }

      refreshData(nextSession ?? null).catch(() => undefined);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refreshData]);

  React.useEffect(() => {
    if (hasCenteredMap || typeof navigator === 'undefined' || !navigator.geolocation) {
      return undefined;
    }

    let active = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) {
          return;
        }

        const nextRegion = createRegionFromLocation(position.coords);
        const point = projectCoordinates(nextRegion.latitude, nextRegion.longitude);
        setViewport((current) => centerViewportOnPoint(current, point));
        setHasCenteredMap(true);
      },
      () => {
        if (active) {
          setHasCenteredMap(true);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000,
      }
    );

    return () => {
      active = false;
    };
  }, [hasCenteredMap]);

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

  const currentRegion = React.useMemo(() => viewportToRegion(viewport), [viewport]);
  const selectedPlace = React.useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  );
  const visiblePlaces = React.useMemo(
    () => getMapPlacesForRegion(places, currentRegion, votes, selectedPlaceId),
    [currentRegion, places, selectedPlaceId, votes]
  );
  const comments = React.useMemo(
    () => getCommentsForPlace(allComments, selectedPlace?.id),
    [allComments, selectedPlace]
  );
  const voteBreakdown = React.useMemo(
    () => getVoteBreakdown(votes, selectedPlace?.id),
    [votes, selectedPlace]
  );
  const currentVote = React.useMemo(() => {
    if (!selectedPlace || !session?.user?.id) {
      return 0;
    }

    return (
      votes.find(
        (vote) => vote.placeId === selectedPlace.id && vote.userId === session.user.id
      )?.value ?? 0
    );
  }, [selectedPlace, session, votes]);
  const addPinCoordinates = React.useMemo(
    () =>
      viewportPointToCoordinates(viewport, {
        x: 0.5,
        y: ADD_PLACE_PIN_VERTICAL_FRACTION,
      }),
    [viewport]
  );
  const mapTransform = React.useMemo(
    () => getMapTransform(viewport, viewportSize),
    [viewport, viewportSize]
  );
  const selectedIndex = visiblePlaces.findIndex((place) => place.id === selectedPlaceId);

  const selectPlace = React.useCallback(
    (placeId, options = {}) => {
      const place = places.find((candidate) => candidate.id === placeId);

      if (!place) {
        return;
      }

      setSelectedPlaceId(place.id);
      setIsAddMode(false);

      if (options.recenter) {
        setViewport((current) =>
          centerViewportOnPoint(current, projectCoordinates(place.latitude, place.longitude))
        );
      }

      if (options.openModal !== false) {
        setIsPlaceModalVisible(true);
      }

      if (viewerSessionId && hasSupabaseConfig) {
        createPlaceOpenEvent({
          placeId: place.id,
          userId: session?.user?.id ?? null,
          viewerSessionId,
          sourceScreen: options.sourceScreen ?? 'web_home_pin_modal',
        }).catch(() => undefined);
      }
    },
    [places, session?.user?.id, viewerSessionId]
  );

  const changeSelection = React.useCallback(
    (direction) => {
      if (!visiblePlaces.length) {
        return;
      }

      const initialIndex = selectedIndex >= 0 ? selectedIndex : 0;
      const nextIndex =
        direction === 'forward'
          ? (initialIndex + 1) % visiblePlaces.length
          : (initialIndex - 1 + visiblePlaces.length) % visiblePlaces.length;

      selectPlace(visiblePlaces[nextIndex].id, { recenter: true, openModal: false });
    },
    [selectPlace, selectedIndex, visiblePlaces]
  );

  const closePlaceModal = React.useCallback(() => {
    setIsPlaceModalVisible(false);
  }, []);

  const openAuthModal = React.useCallback(() => {
    setIsAuthModalVisible(true);
  }, []);

  const resetViewport = React.useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
  }, []);

  const getInteractionSize = React.useCallback(() => {
    if (viewportSize.width && viewportSize.height) {
      return viewportSize;
    }

    const boundsRect = mapSurfaceRef.current?.getBoundingClientRect?.();

    return {
      width: boundsRect?.width ?? 0,
      height: boundsRect?.height ?? 0,
    };
  }, [viewportSize]);

  const handleWheel = React.useCallback(
    (event) => {
      if (!mapSurfaceRef.current) {
        return;
      }

      event.preventDefault();
      const boundsRect = mapSurfaceRef.current.getBoundingClientRect();
      const interactionSize = getInteractionSize();

      if (isTrackpadPan(event)) {
        const panX = Math.abs(event.deltaX) > 0 ? event.deltaX : event.shiftKey ? event.deltaY : 0;
        setViewport((current) => moveViewport(current, panX, event.deltaY, interactionSize));
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
    [getInteractionSize]
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

      setViewport((current) => moveViewport(current, -deltaX, -deltaY, getInteractionSize()));
    },
    [getInteractionSize]
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
      if (event.key === 'Escape') {
        event.preventDefault();

        if (isComposerModalVisible) {
          setIsComposerModalVisible(false);
          setCommentDraft('');
          setReplyTarget(null);
          return;
        }

        if (isDiscussionModalVisible) {
          setIsDiscussionModalVisible(false);
          return;
        }

        if (isAddSheetVisible) {
          setIsAddSheetVisible(false);
          return;
        }

        if (isAuthModalVisible) {
          setIsAuthModalVisible(false);
          return;
        }

        if (isPlaceModalVisible) {
          setIsPlaceModalVisible(false);
          return;
        }

        if (isAddMode) {
          setIsAddMode(false);
        }

        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          setViewport((current) => moveViewport(current, -96, 0, getInteractionSize()));
          break;
        case 'ArrowRight':
          event.preventDefault();
          setViewport((current) => moveViewport(current, 96, 0, getInteractionSize()));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setViewport((current) => moveViewport(current, 0, -96, getInteractionSize()));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setViewport((current) => moveViewport(current, 0, 96, getInteractionSize()));
          break;
        case '+':
        case '=':
          event.preventDefault();
          setViewport((current) =>
            zoomViewport(current, current.zoom * KEYBOARD_ZOOM_STEP, { x: 0.5, y: 0.5 })
          );
          break;
        case '-':
        case '_':
          event.preventDefault();
          setViewport((current) =>
            zoomViewport(current, current.zoom / KEYBOARD_ZOOM_STEP, { x: 0.5, y: 0.5 })
          );
          break;
        case '0':
          event.preventDefault();
          resetViewport();
          break;
        case 'Home':
          event.preventDefault();
          if (visiblePlaces[0]) {
            selectPlace(visiblePlaces[0].id, { recenter: true, openModal: false });
          }
          break;
        case 'End':
          event.preventDefault();
          if (visiblePlaces[visiblePlaces.length - 1]) {
            selectPlace(visiblePlaces[visiblePlaces.length - 1].id, {
              recenter: true,
              openModal: false,
            });
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
        case 'Enter':
          if (selectedPlaceId) {
            event.preventDefault();
            setIsPlaceModalVisible(true);
          }
          break;
        default:
          break;
      }
    },
    [
      changeSelection,
      isAddMode,
      isAddSheetVisible,
      isAuthModalVisible,
      isComposerModalVisible,
      isDiscussionModalVisible,
      isPlaceModalVisible,
      resetViewport,
      selectPlace,
      selectedPlaceId,
      getInteractionSize,
      visiblePlaces,
    ]
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

  const handleVote = React.useCallback(
    async (value) => {
      if (!isAuthenticated || !selectedPlace) {
        setIsPlaceModalVisible(false);
        openAuthModal();
        return;
      }

      try {
        await voteForPlace({
          placeId: selectedPlace.id,
          userId: session.user.id,
          value,
        });
        await refreshData(session);
      } catch (error) {
        setErrorMessage(error?.message ?? 'Vote failed.');
      }
    },
    [isAuthenticated, openAuthModal, refreshData, selectedPlace, session]
  );

  const openComposer = React.useCallback(
    (nextReplyTarget = null) => {
      if (!isAuthenticated) {
        setIsPlaceModalVisible(false);
        setIsDiscussionModalVisible(false);
        openAuthModal();
        return;
      }

      setReplyTarget(nextReplyTarget);
      setCommentDraft(nextReplyTarget ? `@${nextReplyTarget.authorName || 'Topey user'} ` : '');
      setIsComposerModalVisible(true);
    },
    [isAuthenticated, openAuthModal]
  );

  const handleSubmitComment = React.useCallback(async () => {
    if (!selectedPlace) {
      return;
    }

    if (!isAuthenticated) {
      setIsComposerModalVisible(false);
      openAuthModal();
      return;
    }

    if (!commentDraft.trim()) {
      setErrorMessage('Write something before posting.');
      return;
    }

    try {
      setIsSubmittingComment(true);
      await createComment({
        placeId: selectedPlace.id,
        user: session.user,
        body: commentDraft,
      });
      await refreshData(session);
      setIsComposerModalVisible(false);
      setCommentDraft('');
      setReplyTarget(null);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error?.message ?? 'Comment failed.');
    } finally {
      setIsSubmittingComment(false);
    }
  }, [commentDraft, isAuthenticated, openAuthModal, refreshData, selectedPlace, session]);

  const handleCommentVote = React.useCallback(
    (commentId, value) => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }

      setCommentVotes((currentVotes) => {
        const currentValue = currentVotes[commentId] ?? 0;

        return {
          ...currentVotes,
          [commentId]: currentValue === value ? 0 : value,
        };
      });
    },
    [isAuthenticated, openAuthModal]
  );

  const handleSignUp = React.useCallback(async ({ email, username, password }) => {
    if (!supabase) {
      setErrorMessage('Supabase is not configured for browser auth.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = normalizeAnonymousUsername(username);

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    if (normalizedUsername.length < 3) {
      setErrorMessage('Choose an anonymous username with at least 3 characters.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsAuthBusy(true);
      setErrorMessage('');
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            preferred_username: normalizedUsername,
          },
        },
      });

      if (error) {
        throw error;
      }

      setAuthNoticeMessage('Account created. If email confirmation is enabled, finish it from your inbox.');
    } catch (error) {
      setErrorMessage(error?.message ?? 'Sign-up failed.');
    } finally {
      setIsAuthBusy(false);
    }
  }, []);

  const handleSignIn = React.useCallback(async ({ email, password }) => {
    if (!supabase) {
      setErrorMessage('Supabase is not configured for browser auth.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Enter your password.');
      return;
    }

    try {
      setIsAuthBusy(true);
      setErrorMessage('');
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setErrorMessage(error?.message ?? 'Sign-in failed.');
    } finally {
      setIsAuthBusy(false);
    }
  }, []);

  const handleGoogleSignIn = React.useCallback(async () => {
    if (!supabase) {
      setErrorMessage('Supabase is not configured for browser auth.');
      return;
    }

    try {
      setIsAuthBusy(true);
      setErrorMessage('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setIsAuthBusy(false);
      setErrorMessage(error?.message ?? 'Google sign-in failed.');
    }
  }, []);

  const handleSignOut = React.useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setIsAuthModalVisible(false);
      return;
    }

    try {
      await supabase.auth.signOut();
      setSession(null);
      setIsAuthModalVisible(false);
      await refreshData(null);
    } catch (error) {
      setErrorMessage(error?.message ?? 'Sign-out failed.');
    }
  }, [refreshData]);

  const beginAddPlace = React.useCallback(() => {
    setIsAddMode(true);
    setIsPlaceModalVisible(false);
    setSelectedPlaceId('');
  }, []);

  const cancelAddPlace = React.useCallback(() => {
    setIsAddMode(false);
    setIsAddSheetVisible(false);
    setNewPlaceName('');
    setNewPlaceDescription('');
  }, []);

  const handleCreatePlace = React.useCallback(async () => {
    if (!newPlaceName.trim() || !newPlaceDescription.trim()) {
      setErrorMessage('Add a name and description before saving the place.');
      return;
    }

    if (!isAuthenticated) {
      setIsAddSheetVisible(false);
      openAuthModal();
      return;
    }

    try {
      setIsSavingPlace(true);
      await createPlace({
        user: session.user,
        name: newPlaceName,
        description: newPlaceDescription,
        latitude: addPinCoordinates.latitude,
        longitude: addPinCoordinates.longitude,
      });

      const nextData = await refreshData(session);
      const newestPlace = nextData.places[0];
      setNewPlaceName('');
      setNewPlaceDescription('');
      setIsAddSheetVisible(false);
      setIsAddMode(false);
      setErrorMessage('');

      if (newestPlace) {
        selectPlace(newestPlace.id, {
          recenter: true,
          sourceScreen: 'web_add_place',
        });
      }
    } catch (error) {
      setErrorMessage(error?.message ?? 'Save failed.');
    } finally {
      setIsSavingPlace(false);
    }
  }, [
    addPinCoordinates.latitude,
    addPinCoordinates.longitude,
    isAuthenticated,
    newPlaceDescription,
    newPlaceName,
    openAuthModal,
    refreshData,
    selectPlace,
    session,
  ]);

  const topButton = isAddMode ? (
    <div className="hud-row hud-row-split">
      <AppButton
        label="Back"
        variant="secondary"
        size="compact"
        onClick={cancelAddPlace}
      />
      <AppButton
        label="Add here"
        size="compact"
        onClick={() => setIsAddSheetVisible(true)}
      />
    </div>
  ) : (
    <div className="hud-row hud-row-end">
      <AppButton
        label={isAuthenticated ? 'Profile' : 'Sign in'}
        variant="secondary"
        size="compact"
        onClick={openAuthModal}
        testId="account-button"
      />
    </div>
  );

  if (!isHydrated) {
    return (
      <div className="loading-screen">
        <div className="loading-title">Topey</div>
        <p className="loading-copy">Loading the map and latest place data.</p>
      </div>
    );
  }

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
        '--color-backdrop': colors.sheetBackdrop,
        '--color-handle': colors.handle,
      }}
    >
      <div className="sr-only" id={helpId}>
        Drag or two-finger scroll to pan. Pinch, wheel, or double-click to zoom. Arrow keys pan,
        Page Up and Page Down change places, and 0 resets the camera.
      </div>

      <main className={`map-screen${isAddMode ? ' is-add-mode' : ''}`}>
        <div
          ref={mapSurfaceRef}
          className={`map-surface${isDragging ? ' is-dragging' : ''}`}
          data-size-ready={viewportSize.width > 0 && viewportSize.height > 0 ? 'true' : 'false'}
          data-testid="map-surface"
          role="application"
          aria-label="Topey map"
          aria-describedby={helpId}
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight PageUp PageDown Home End + - 0 Escape"
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
            {visiblePlaces.map((place) => {
              const point = projectCoordinates(place.latitude, place.longitude);
              const isSelected = place.id === selectedPlaceId;

              return (
                <button
                  key={place.id}
                  className={`place-dot${isSelected ? ' is-selected' : ''}`}
                  style={{
                    left: `${(point.x * 100).toFixed(2)}%`,
                    top: `${(point.y * 100).toFixed(2)}%`,
                  }}
                  type="button"
                  onClick={() =>
                    selectPlace(place.id, {
                      sourceScreen: 'web_home_pin_modal',
                    })
                  }
                  aria-label={`Open ${place.name}`}
                />
              );
            })}
          </div>

          {isAddMode ? (
            <div
              className="center-pin"
              aria-hidden="true"
              style={{ top: `${ADD_PLACE_PIN_VERTICAL_FRACTION * 100}%` }}
            >
              <div className="center-pin-bubble" />
              <div className="center-pin-stem" />
              <div className="center-pin-shadow" />
            </div>
          ) : null}
        </div>

        <div className="map-hud map-hud-top">{topButton}</div>

        {!isAddMode ? (
          <div className="map-hud map-hud-bottom">
            <button
              className="fab-button"
              type="button"
              onClick={beginAddPlace}
              aria-label="Add a place"
              data-testid="add-place-button"
            >
              +
            </button>
          </div>
        ) : null}
      </main>

      {selectedPlace && isPlaceModalVisible ? (
        <SheetModal onClose={closePlaceModal}>
          <div className="sheet-header">
            <div className="sheet-handle" />
            <h2 className="sheet-title">{selectedPlace.name}</h2>
            <p className="sheet-copy">{selectedPlace.description}</p>
          </div>

          <div className="stats-row">
            <PreviewStat
              label="Rating"
              value={`${voteBreakdown.score >= 0 ? '+' : ''}${voteBreakdown.score}`}
            />
            <PreviewStat label="Votes" value={voteBreakdown.ratioLabel} />
            <PreviewStat label="Threads" value={`${selectedPlace.threadCount ?? comments.length}`} />
          </div>

          <AppButton
            label="Open location"
            size="default"
            onClick={() => window.open(openLocationHref(selectedPlace), '_blank', 'noreferrer')}
            styleClassName="block-button"
          />

          <div className="participation-row">
            <VoteControls
              currentVote={currentVote}
              onDownvote={() => handleVote(-1)}
              onUpvote={() => handleVote(1)}
              score={voteBreakdown.score}
            />
            <div className="added-by">
              Added by: <span>{selectedPlace.authorName || 'Topey user'}</span>
            </div>
          </div>

          <ConversationPreview
            comments={comments}
            commentVotes={commentVotes}
            isAuthenticated={isAuthenticated}
            onCommentVote={handleCommentVote}
            onCompose={openComposer}
            onOpenDiscussion={() => {
              if (!isAuthenticated) {
                setIsPlaceModalVisible(false);
                openAuthModal();
                return;
              }

              setIsDiscussionModalVisible(true);
            }}
          />
        </SheetModal>
      ) : null}

      {isAuthModalVisible ? (
        <SheetModal onClose={() => setIsAuthModalVisible(false)}>
          <div className="sheet-header">
            <div className="sheet-handle" />
            {isAuthenticated ? (
              <>
                <h2 className="sheet-title">Profile</h2>
                <div className="profile-name">{currentUser.name}</div>
                {currentUser.email ? <div className="profile-meta">{currentUser.email}</div> : null}
                <AppButton
                  label="Sign out"
                  size="default"
                  onClick={handleSignOut}
                  styleClassName="auth-signout-button"
                />
              </>
            ) : (
              <AuthCard
                authBusy={isAuthBusy}
                errorMessage={errorMessage}
                helperText={authNoticeMessage}
                onGoogleSignIn={handleGoogleSignIn}
                onSignIn={handleSignIn}
                onSignUp={handleSignUp}
              />
            )}
            {!isAuthenticated && errorMessage ? <p className="sheet-meta">{errorMessage}</p> : null}
          </div>
        </SheetModal>
      ) : null}

      {isDiscussionModalVisible && selectedPlace ? (
        <SheetModal onClose={() => setIsDiscussionModalVisible(false)} tall>
          <div className="sheet-header">
            <div className="sheet-handle" />
            <h2 className="sheet-title">Discussion</h2>
            <p className="sheet-subtitle">{selectedPlace.name}</p>
          </div>

          <div className="discussion-list">
            {comments.map((comment) => (
              <article key={comment.id} className="discussion-comment">
                <strong className="comment-author">{comment.authorName || 'Topey user'}</strong>
                <p className="comment-body">{comment.body}</p>
                <div className="comment-actions">
                  <CommentArrowButton
                    direction="up"
                    isActive={(commentVotes[comment.id] ?? 0) === 1}
                    onClick={() => handleCommentVote(comment.id, 1)}
                  />
                  <span className="comment-score">
                    {formatSignedValue(commentVotes[comment.id] ?? 0)}
                  </span>
                  <CommentArrowButton
                    direction="down"
                    isActive={(commentVotes[comment.id] ?? 0) === -1}
                    onClick={() => handleCommentVote(comment.id, -1)}
                  />
                  <button
                    className="reply-button"
                    type="button"
                    onClick={() => openComposer(comment)}
                  >
                    Reply
                  </button>
                </div>
              </article>
            ))}
          </div>

          <button className="compose-fab compose-fab-sheet" type="button" onClick={() => openComposer()}>
            +
          </button>
        </SheetModal>
      ) : null}

      {isComposerModalVisible ? (
        <SheetModal onClose={() => setIsComposerModalVisible(false)}>
          <div className="sheet-header">
            <div className="sheet-handle" />
            <h2 className="sheet-title">
              {replyTarget ? `Reply to ${replyTarget.authorName || 'Topey user'}` : 'Add a comment'}
            </h2>
          </div>

          <textarea
            autoFocus
            className="composer-input"
            placeholder={replyTarget ? 'Write your reply' : 'Write your comment'}
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
          />

          <div className="composer-actions">
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setIsComposerModalVisible(false);
                setCommentDraft('');
                setReplyTarget(null);
              }}
            >
              Cancel
            </button>
            <AppButton
              label={isSubmittingComment ? 'Sending' : 'Post'}
              size="compact"
              onClick={handleSubmitComment}
            />
          </div>
        </SheetModal>
      ) : null}

      {isAddSheetVisible ? (
        <SheetModal onClose={() => setIsAddSheetVisible(false)}>
          <div className="sheet-header">
            <div className="sheet-handle" />
            <h2 className="sheet-title">Place details</h2>
            <p className="sheet-copy">
              Confirm this pin and fill in the details before the place is added.
            </p>
          </div>

          {!isAuthenticated ? (
            <div className="auth-callout">
              <strong>Login required before adding.</strong>
              <p>Sign in to add a place.</p>
              <AppButton
                label="Sign in"
                size="compact"
                onClick={() => {
                  setIsAddSheetVisible(false);
                  openAuthModal();
                }}
              />
            </div>
          ) : null}

          <input
            className="sheet-input"
            placeholder="Place name"
            value={newPlaceName}
            onChange={(event) => setNewPlaceName(event.target.value)}
          />
          <textarea
            className="sheet-input sheet-input-multiline"
            placeholder="Description"
            value={newPlaceDescription}
            onChange={(event) => setNewPlaceDescription(event.target.value)}
          />

          <div className="coords-card">
            <div className="coords-label">Adding at</div>
            <div className="coords-value">
              {addPinCoordinates.latitude.toFixed(5)}, {addPinCoordinates.longitude.toFixed(5)}
            </div>
          </div>

          <div className="composer-actions">
            <button className="text-button" type="button" onClick={() => setIsAddSheetVisible(false)}>
              Cancel
            </button>
            <AppButton
              label={isSavingPlace ? 'Adding...' : 'Add'}
              size="compact"
              onClick={handleCreatePlace}
            />
          </div>
        </SheetModal>
      ) : null}
    </div>
  );
}

function SheetModal({ children, onClose, tall = false }) {
  return (
    <div className="modal-root" role="dialog" aria-modal="true">
      <button className="modal-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <div className={`sheet${tall ? ' sheet-tall' : ''}`}>{children}</div>
    </div>
  );
}

function AppButton({
  label,
  onClick,
  variant = 'primary',
  size = 'default',
  styleClassName = '',
  testId,
}) {
  return (
    <button
      className={`app-button is-${variant} is-${size}${styleClassName ? ` ${styleClassName}` : ''}`}
      type="button"
      onClick={onClick}
      data-testid={testId}
    >
      {label}
    </button>
  );
}

function PreviewStat({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function VoteControls({ currentVote, onDownvote, onUpvote, score }) {
  return (
    <div className="vote-controls">
      <button className="vote-arrow" type="button" onClick={onUpvote}>
        <span className={currentVote === 1 ? 'is-active' : ''}>↑</span>
      </button>
      <span className="vote-score">{formatSignedValue(score)}</span>
      <button className="vote-arrow" type="button" onClick={onDownvote}>
        <span className={currentVote === -1 ? 'is-active' : ''}>↓</span>
      </button>
    </div>
  );
}

function ConversationPreview({
  comments,
  commentVotes,
  isAuthenticated,
  onCommentVote,
  onCompose,
  onOpenDiscussion,
}) {
  const previewComments = comments.slice(0, 2);

  return (
    <div className="conversation-preview">
      <div className="thread-card">
        {previewComments.length ? (
          previewComments.map((comment, index) => {
            const isLastPreview = index === previewComments.length - 1;
            const shouldFadeOut = previewComments.length > 1 && isLastPreview;

            return (
              <article key={comment.id} className="preview-comment">
                {index > 0 ? <div className="thread-separator" /> : null}
                <div className="preview-comment-content">
                  <strong className="comment-author">{comment.authorName || 'Topey user'}</strong>
                  <p className="comment-body">{comment.body}</p>
                  {!shouldFadeOut ? (
                    <div className="comment-actions">
                      <CommentArrowButton
                        direction="up"
                        isActive={(commentVotes[comment.id] ?? 0) === 1}
                        onClick={() => onCommentVote(comment.id, 1)}
                      />
                      <span className="comment-score">
                        {formatSignedValue(commentVotes[comment.id] ?? 0)}
                      </span>
                      <CommentArrowButton
                        direction="down"
                        isActive={(commentVotes[comment.id] ?? 0) === -1}
                        onClick={() => onCommentVote(comment.id, -1)}
                      />
                      <button
                        className="reply-button"
                        type="button"
                        onClick={() => onCompose(comment)}
                      >
                        Reply
                      </button>
                    </div>
                  ) : null}
                  {shouldFadeOut ? (
                    <div className="preview-fade">
                      <button className="see-more-button" type="button" onClick={onOpenDiscussion}>
                        See More
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-state">
            <strong>No discussion yet.</strong>
            <p>Start the first comment for this place.</p>
          </div>
        )}
      </div>

      <button className="compose-fab" type="button" onClick={() => onCompose()}>
        +
      </button>
    </div>
  );
}

function CommentArrowButton({ direction, isActive, onClick }) {
  return (
    <button className="comment-arrow" type="button" onClick={onClick}>
      <span className={isActive ? 'is-active' : ''}>{direction === 'up' ? '↑' : '↓'}</span>
    </button>
  );
}

function AuthCard({
  authBusy,
  errorMessage,
  helperText,
  onGoogleSignIn,
  onSignIn,
  onSignUp,
}) {
  const [mode, setMode] = React.useState('signin');
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const isSignUp = mode === 'signup';

  return (
    <div className="auth-card">
      <h2 className="sheet-title">{isSignUp ? 'Create account' : 'Sign in'}</h2>

      <AppButton
        label={authBusy ? 'Please wait...' : 'Continue with Google'}
        variant="secondary"
        size="default"
        onClick={onGoogleSignIn}
        styleClassName="auth-google-button"
      />

      <div className="auth-divider">
        <span />
        <p>or continue with email</p>
        <span />
      </div>

      <input
        className="sheet-input"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {isSignUp ? (
        <input
          className="sheet-input"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Anonymous username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      ) : null}
      <input
        className="sheet-input"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <AppButton
        label={
          authBusy
            ? isSignUp
              ? 'Creating account...'
              : 'Signing in...'
            : isSignUp
              ? 'Create account'
              : 'Sign in'
        }
        size="default"
        onClick={() =>
          isSignUp
            ? onSignUp({ email, username, password })
            : onSignIn({ email, password })
        }
      />
      <button className="toggle-auth-button" type="button" onClick={() => setMode(isSignUp ? 'signin' : 'signup')}>
        {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
      </button>
      {helperText ? <p className="sheet-meta">{helperText}</p> : null}
      {!helperText && errorMessage ? <p className="sheet-meta">{errorMessage}</p> : null}
    </div>
  );
}

function formatSignedValue(value) {
  if (value > 0) {
    return `+${value}`;
  }

  return `${value}`;
}
