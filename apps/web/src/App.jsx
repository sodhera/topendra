import React from 'react';
import {
  getAnonymousHandle,
  getUserIdentity,
  hasAnonymousHandle,
  isLoggedIn,
  normalizeAnonymousUsername,
} from '@topey/shared/lib/auth';
import {
  AUTH_PRIVACY_COPY,
  DEFAULT_REGION,
  KATHMANDU_EXPLORE_REGION,
  PENDING_ANONYMOUS_HANDLE_KEY,
  VIEWER_SESSION_KEY,
} from '@topey/shared/lib/constants';
import {
  doesPlaceMatchTagFilter,
  getPlaceTagLabel,
  isCustomPlaceTagOption,
  PLACE_TAG_FILTER_OPTIONS,
  PLACE_TAG_PRESET_OPTIONS,
  resolvePlaceTagValue,
} from '@topey/shared/lib/placeTags';
import {
  createRegionFromLocation,
  getCommentThreadsForPlace,
  getCommentsForPlace,
  getMapPlacesForRegion,
  getVoteBreakdown,
} from '@topey/shared/lib/geo';
import {
  claimAnonymousHandle,
  createComment,
  createFeedbackSubmission,
  createPlace,
  createPlaceOpenEvent,
  fetchAppData,
  voteForComment,
  voteForPlace,
  deletePlace,
  savePlace,
  unsavePlace,
  uploadPlacePhotos,
} from './lib/backend';
import {
  captureAnalyticsEvent,
  identifyAnalyticsUser,
  initializeAnalytics,
  resetAnalyticsUser,
  setAnalyticsContext,
} from './lib/analytics';
import { getSafeSession, hasSupabaseConfig, supabase } from './lib/supabase';
import { colors as sharedColors } from '@topey/shared/lib/theme';
import DesktopMap from './components/DesktopMap';

const APP_NAME = 'Zazaspot';
const APP_TAGLINE =
  "Have Zaza but don't know where to smoke? Find user-added chill, zaza friendly spots around the globe.";
const COLOR_MODE_STORAGE_KEY = 'zazaspot-color-mode';
const MAX_PLACE_PHOTO_UPLOADS = 4;
const LIGHT_WEB_SHELL_COLORS = {
  ...sharedColors,
  accentText: '#111111',
  focusRing: 'rgba(20, 150, 71, 0.3)',
  gridLine: 'rgba(17, 17, 17, 0.06)',
  loadingGradientStart: 'rgba(167, 255, 101, 0.28)',
  loadingGradientEnd: 'rgba(255, 255, 255, 0.82)',
  pageGridLine: 'rgba(17, 17, 17, 0.05)',
  pageGradientStart: 'rgba(167, 255, 101, 0.42)',
  pageGradientEnd: 'rgba(255, 255, 255, 0.92)',
  pageDecorativeGlowA: 'rgba(209, 132, 98, 0.12)',
  pageDecorativeGlowB: 'rgba(120, 153, 218, 0.08)',
  pageGlareA: 'rgba(255, 255, 255, 0.08)',
  pageGlareB: 'rgba(255, 255, 255, 0.05)',
  metaDot: 'rgba(17, 17, 17, 0.52)',
  summaryDot: 'rgba(17, 17, 17, 0.46)',
  mapSurfaceBackground: '#dbe4e8',
  mapTooltipBackground: 'rgba(255, 253, 249, 0.97)',
  mapTooltipBorder: 'rgba(17, 17, 17, 0.16)',
  mapTooltipShadow: 'rgba(24, 24, 27, 0.12)',
  mapTooltipText: '#18181b',
  mapTooltipButtonBackground: '#111111',
  mapTooltipButtonText: '#ffffff',
  mapLoadingBackgroundA: 'rgba(255, 255, 255, 0.72)',
  mapLoadingBackgroundB: 'rgba(244, 244, 245, 0.76)',
  mapLoadingBackgroundBase: 'rgba(244, 244, 245, 0.72)',
  mapLoadingBorder: 'rgba(24, 24, 27, 0.08)',
  mapLoadingShadow: 'rgba(24, 24, 27, 0.08)',
  mapAttributionBackground: 'rgba(255, 255, 255, 0.96)',
  mapAttributionShadow: 'rgba(24, 24, 27, 0.1)',
  previewFadeMid: 'rgba(246, 255, 223, 0.92)',
  previewFadeEnd: 'rgba(255, 255, 255, 1)',
  shadowStrong: 'rgba(17, 17, 17, 0.92)',
  shadowContrast: 'rgba(17, 17, 17, 0.92)',
};
const DARK_WEB_SHELL_COLORS = {
  ...sharedColors,
  background: '#0f160c',
  card: '#172118',
  elevatedCard: '#223126',
  border: '#ddffd4',
  separator: '#7ecf7d',
  text: '#f3ffe8',
  mutedText: '#abd89f',
  primary: '#82f16a',
  primaryText: '#10210e',
  secondary: '#172118',
  accent: '#d7ff6d',
  accentText: '#10210e',
  mapOverlay: 'rgba(15, 22, 12, 0.72)',
  sheetBackdrop: 'rgba(8, 11, 7, 0.54)',
  handle: '#ddffd4',
  focusRing: 'rgba(130, 241, 106, 0.42)',
  gridLine: 'rgba(221, 255, 212, 0.08)',
  loadingGradientStart: 'rgba(130, 241, 106, 0.22)',
  loadingGradientEnd: 'rgba(15, 22, 12, 0.94)',
  pageGridLine: 'rgba(221, 255, 212, 0.07)',
  pageGradientStart: 'rgba(130, 241, 106, 0.14)',
  pageGradientEnd: 'rgba(12, 18, 11, 0.96)',
  pageDecorativeGlowA: 'rgba(130, 241, 106, 0.08)',
  pageDecorativeGlowB: 'rgba(73, 135, 96, 0.12)',
  pageGlareA: 'rgba(255, 255, 255, 0.03)',
  pageGlareB: 'rgba(255, 255, 255, 0.02)',
  metaDot: 'rgba(221, 255, 212, 0.44)',
  summaryDot: 'rgba(221, 255, 212, 0.38)',
  mapSurfaceBackground: '#111917',
  mapTooltipBackground: 'rgba(23, 33, 24, 0.98)',
  mapTooltipBorder: 'rgba(221, 255, 212, 0.28)',
  mapTooltipShadow: 'rgba(0, 0, 0, 0.32)',
  mapTooltipText: '#f3ffe8',
  mapTooltipButtonBackground: '#d7ff6d',
  mapTooltipButtonText: '#10210e',
  mapLoadingBackgroundA: 'rgba(23, 33, 24, 0.9)',
  mapLoadingBackgroundB: 'rgba(12, 18, 11, 0.94)',
  mapLoadingBackgroundBase: 'rgba(12, 18, 11, 0.9)',
  mapLoadingBorder: 'rgba(221, 255, 212, 0.22)',
  mapLoadingShadow: 'rgba(0, 0, 0, 0.22)',
  mapAttributionBackground: 'rgba(23, 33, 24, 0.92)',
  mapAttributionShadow: 'rgba(0, 0, 0, 0.28)',
  previewFadeMid: 'rgba(34, 49, 38, 0.94)',
  previewFadeEnd: 'rgba(23, 33, 24, 1)',
  shadowStrong: 'rgba(0, 0, 0, 0.68)',
  shadowContrast: 'rgba(221, 255, 212, 0.26)',
};
const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

function getStoredColorMode() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.localStorage.getItem(COLOR_MODE_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

function getVoteKey(entityId, userId) {
  return `${entityId}:${userId}`;
}

function applyVoteOverride(votes, { entityId, entityKey, userId, value }) {
  let hasMatchedExistingVote = false;
  const nextVotes = [];

  votes.forEach((vote) => {
    if (vote[entityKey] === entityId && vote.userId === userId) {
      hasMatchedExistingVote = true;

      if (value !== 0) {
        nextVotes.push({
          ...vote,
          value,
        });
      }

      return;
    }

    nextVotes.push(vote);
  });

  if (!hasMatchedExistingVote && value !== 0) {
    nextVotes.unshift({
      id: `optimistic-${entityId}-${userId}`,
      [entityKey]: entityId,
      userId,
      value,
      createdAt: new Date().toISOString(),
    });
  }

  return nextVotes;
}

function applyOptimisticVotes(votes, optimisticVotesByKey, entityKey) {
  return Object.values(optimisticVotesByKey).reduce(
    (currentVotes, voteOverride) =>
      applyVoteOverride(currentVotes, {
        ...voteOverride,
        entityKey,
      }),
    votes
  );
}

function getVoteScore(votes, entityKey, entityId) {
  return votes.reduce((score, vote) => {
    if (vote[entityKey] !== entityId) {
      return score;
    }

    return score + vote.value;
  }, 0);
}

function getCurrentVoteValue(votes, entityKey, entityId, userId) {
  if (!entityId || !userId) {
    return 0;
  }

  return (
    votes.find((vote) => vote[entityKey] === entityId && vote.userId === userId)?.value ?? 0
  );
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

function readPendingAnonymousHandle() {
  if (typeof window === 'undefined') {
    return '';
  }

  return normalizeAnonymousUsername(
    window.localStorage.getItem(PENDING_ANONYMOUS_HANDLE_KEY) ?? ''
  );
}

function writePendingAnonymousHandle(handle) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedHandle = normalizeAnonymousUsername(handle);

  if (normalizedHandle) {
    window.localStorage.setItem(PENDING_ANONYMOUS_HANDLE_KEY, normalizedHandle);
    return;
  }

  window.localStorage.removeItem(PENDING_ANONYMOUS_HANDLE_KEY);
}

function openLocationHref(place) {
  const coordinates = `${place.latitude},${place.longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${coordinates}`;
}

function getWebAuthRedirectUrl() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return new URL(window.location.pathname, window.location.origin).toString();
}

function getPlacePath(placeId) {
  return `/places/${encodeURIComponent(placeId)}`;
}

function getAnalyticsClickLabel(element) {
  if (!(element instanceof HTMLElement)) {
    return '';
  }

  return (
    element.getAttribute('aria-label') ||
    element.dataset.testid ||
    element.textContent?.replace(/\s+/g, ' ').trim() ||
    ''
  ).slice(0, 80);
}

function getAppRouteFromLocation() {
  if (typeof window === 'undefined') {
    return {
      placeId: '',
      view: 'map',
    };
  }

  const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const placeMatch = normalizedPath.match(/^\/places\/([^/]+)$/);

  if (!placeMatch) {
    return {
      placeId: '',
      view: 'map',
    };
  }

  try {
    return {
      placeId: decodeURIComponent(placeMatch[1]),
      view: 'place',
    };
  } catch {
    return {
      placeId: placeMatch[1],
      view: 'place',
    };
  }
}

export default function App() {
  const helpId = React.useId();
  const [appRoute, setAppRoute] = React.useState(() => getAppRouteFromLocation());
  const [session, setSession] = React.useState(null);
  const [viewerSessionId, setViewerSessionId] = React.useState('');
  const [places, setPlaces] = React.useState([]);
  const [savedPlaces, setSavedPlaces] = React.useState([]);
  const [votes, setVotes] = React.useState([]);
  const [allComments, setAllComments] = React.useState([]);
  const [commentVotes, setCommentVotes] = React.useState([]);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isAuthBusy, setIsAuthBusy] = React.useState(false);
  const [authNoticeMessage, setAuthNoticeMessage] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [selectedPlaceId, setSelectedPlaceId] = React.useState('');
  const [focusedPlaceId, setFocusedPlaceId] = React.useState('');
  const [mapRegion, setMapRegion] = React.useState(KATHMANDU_EXPLORE_REGION);
  const [userRegion, setUserRegion] = React.useState(null);
  const [isAuthModalVisible, setIsAuthModalVisible] = React.useState(false);
  const [isComposerModalVisible, setIsComposerModalVisible] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [replyTarget, setReplyTarget] = React.useState(null);
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);
  const [optimisticPlaceVotes, setOptimisticPlaceVotes] = React.useState({});
  const [optimisticCommentVotes, setOptimisticCommentVotes] = React.useState({});
  const [isAddMode, setIsAddMode] = React.useState(false);
  const [isAddSheetVisible, setIsAddSheetVisible] = React.useState(false);
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = React.useState(false);
  const [feedbackDraft, setFeedbackDraft] = React.useState('');
  const [feedbackErrorMessage, setFeedbackErrorMessage] = React.useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);
  const [newPlaceName, setNewPlaceName] = React.useState('');
  const [newPlaceDescription, setNewPlaceDescription] = React.useState('');
  const [newPlaceTagOption, setNewPlaceTagOption] = React.useState(
    PLACE_TAG_PRESET_OPTIONS[0]?.value ?? 'zaza_spots'
  );
  const [newPlaceCustomTag, setNewPlaceCustomTag] = React.useState('');
  const [newPlacePhotos, setNewPlacePhotos] = React.useState([]);
  const [addPinCoordinates, setAddPinCoordinates] = React.useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [activeTagFilters, setActiveTagFilters] = React.useState([]);
  const [isTagMenuOpen, setIsTagMenuOpen] = React.useState(false);
  const [isSavingPlace, setIsSavingPlace] = React.useState(false);
  const [colorMode, setColorMode] = React.useState(() => getStoredColorMode());
  const placeVoteRequestVersionRef = React.useRef({});
  const commentVoteRequestVersionRef = React.useRef({});
  const lastAnalyticsRouteRef = React.useRef('');
  const lastAnalyticsUserIdRef = React.useRef('');
  const tagMenuRef = React.useRef(null);

  const currentUser = React.useMemo(() => getUserIdentity(session?.user), [session]);
  const currentAnonymousHandle = React.useMemo(
    () => getAnonymousHandle(session?.user),
    [session]
  );
  const isAuthenticated = isLoggedIn(session);
  const canPostAnonymously = hasAnonymousHandle(session?.user);
  const isPlaceRoute = appRoute.view === 'place';
  const isPlacePanelVisible = isPlaceRoute || Boolean(selectedPlaceId);
  const isCustomTagSelected = isCustomPlaceTagOption(newPlaceTagOption);
  const resolvedNewPlaceTag = React.useMemo(
    () =>
      resolvePlaceTagValue({
        customTag: newPlaceCustomTag,
        selectedOption: newPlaceTagOption,
      }),
    [newPlaceCustomTag, newPlaceTagOption]
  );
  const selectedTagCount = activeTagFilters.length;
  const webShellColors = colorMode === 'dark' ? DARK_WEB_SHELL_COLORS : LIGHT_WEB_SHELL_COLORS;
  const tagButtonLabel = selectedTagCount ? `Tags: ${selectedTagCount}` : 'Tags: All';

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
  }, [colorMode]);

  React.useEffect(() => {
    initializeAnalytics();
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handlePopState = () => {
      setAppRoute(getAppRouteFromLocation());
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  React.useEffect(() => {
    if (appRoute.view === 'place' && appRoute.placeId && appRoute.placeId !== selectedPlaceId) {
      setSelectedPlaceId(appRoute.placeId);
    }
  }, [appRoute.placeId, appRoute.view, selectedPlaceId]);

  React.useEffect(() => {
    if (appRoute.view !== 'place' && selectedPlaceId) {
      setSelectedPlaceId('');
    }
  }, [appRoute.view, selectedPlaceId]);

  React.useEffect(() => {
    if (!isTagMenuOpen || typeof window === 'undefined') {
      return undefined;
    }

    function handlePointerDown(event) {
      if (tagMenuRef.current?.contains(event.target)) {
        return;
      }

      setIsTagMenuOpen(false);
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsTagMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isTagMenuOpen]);

  React.useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage('');
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successMessage]);

  React.useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const nextUserId = session?.user?.id ?? '';
    const previousUserId = lastAnalyticsUserIdRef.current;

    if (nextUserId) {
      identifyAnalyticsUser({
        distinctId: nextUserId,
      });
    } else if (previousUserId) {
      resetAnalyticsUser();
    }

    lastAnalyticsUserIdRef.current = nextUserId;
  }, [isHydrated, session?.user]);

  React.useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setAnalyticsContext({
      pagePath: typeof window === 'undefined' ? '/' : window.location.pathname,
      screenName: appRoute.view === 'place' ? 'place_detail' : 'map_home',
      viewerSessionId,
    });

    const trackedPlaceId = appRoute.view === 'place' ? appRoute.placeId : '';
    const routeKey = `${appRoute.view}:${trackedPlaceId}`;

    if (lastAnalyticsRouteRef.current === routeKey) {
      return;
    }

    captureAnalyticsEvent('screen viewed', {
      place_id: trackedPlaceId || null,
      screen_name: appRoute.view === 'place' ? 'place_detail' : 'map_home',
    });
    lastAnalyticsRouteRef.current = routeKey;
  }, [appRoute.placeId, appRoute.view, isHydrated, viewerSessionId]);

  React.useEffect(() => {
    if (!isHydrated || typeof document === 'undefined') {
      return undefined;
    }

    function handleDocumentClick(event) {
      if (!(event.target instanceof Element)) {
        return;
      }

      const target = event.target.closest('button, a, [role="button"]');

      if (!(target instanceof HTMLElement)) {
        return;
      }

      captureAnalyticsEvent('ui element clicked', {
        element_label: getAnalyticsClickLabel(target),
        element_role: target.getAttribute('role') || target.tagName.toLowerCase(),
        href_path:
          target.tagName.toLowerCase() === 'a'
            ? target.getAttribute('href')?.trim() || null
            : null,
        test_id: target.dataset.testid || null,
      });
    }

    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isHydrated]);

  const navigateToRoute = React.useCallback((nextRoute, { replace = false } = {}) => {
    const nextPath = nextRoute.view === 'place' ? getPlacePath(nextRoute.placeId) : '/';

    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';

      if (currentPath !== nextPath) {
        window.history[replace ? 'replaceState' : 'pushState']({}, '', nextPath);
      }
    }

    setAppRoute(nextRoute);
  }, []);

  const maybeClaimPendingHandle = React.useCallback(async (activeSession) => {
    if (!activeSession?.user || !supabase) {
      return activeSession ?? null;
    }

    const pendingHandle = readPendingAnonymousHandle();
    const existingHandle = getAnonymousHandle(activeSession.user);
    const handleToClaim = pendingHandle || existingHandle;

    if (!handleToClaim) {
      return activeSession;
    }

    const claimedHandle = await claimAnonymousHandle({
      user: activeSession.user,
      handle: handleToClaim,
    });
    writePendingAnonymousHandle('');

    return {
      ...activeSession,
      user: {
        ...activeSession.user,
        user_metadata: {
          ...(activeSession.user.user_metadata ?? {}),
          preferred_username: claimedHandle,
        },
      },
    };
  }, []);

  const refreshData = React.useCallback(async (activeSession) => {
    if (!hasSupabaseConfig) {
      setPlaces([]);
      setSavedPlaces([]);
      setVotes([]);
      setAllComments([]);
      setCommentVotes([]);
      setErrorMessage('Supabase environment variables are missing for the web app.');
      return {
        places: [],
        savedPlaces: [],
        votes: [],
        comments: [],
        commentVotes: [],
      };
    }

    try {
      const nextData = await fetchAppData({
        includeComments: Boolean(activeSession?.user),
      });

      setPlaces(nextData.places);
      setSavedPlaces(nextData.savedPlaces ?? []);
      setVotes(nextData.votes);
      setAllComments(nextData.comments);
      setCommentVotes(nextData.commentVotes);
      setErrorMessage('');

      return nextData;
    } catch (error) {
      setPlaces([]);
      setSavedPlaces([]);
      setVotes([]);
      setAllComments([]);
      setCommentVotes([]);
      setErrorMessage(error?.message ?? 'Zazaspot could not reach Supabase right now.');
      return {
        places: [],
        savedPlaces: [],
        votes: [],
        comments: [],
        commentVotes: [],
      };
    }
  }, []);

  const applySession = React.useCallback(
    async (nextSession, { keepAuthModalOpen = false, deferRefresh = false } = {}) => {
      let resolvedSession = nextSession ?? null;

      if (resolvedSession?.user) {
        try {
          resolvedSession = await maybeClaimPendingHandle(resolvedSession);
          setErrorMessage('');
        } catch (error) {
          setErrorMessage(error?.message ?? 'Anonymous name setup failed.');
          setAuthNoticeMessage('Choose a different anonymous name to finish setup.');
          setIsAuthModalVisible(true);
        }
      }

      setSession(resolvedSession);

      const hasHandle = hasAnonymousHandle(resolvedSession?.user);
      if (resolvedSession?.user) {
        if (hasHandle && !keepAuthModalOpen) {
          setIsAuthModalVisible(false);
          setAuthNoticeMessage('');
        } else if (!hasHandle) {
          setIsAuthModalVisible(true);
          setAuthNoticeMessage('Choose an anonymous name before posting or adding places.');
        }
      }

      if (deferRefresh) {
        refreshData(resolvedSession).catch(() => undefined);
      } else {
        await refreshData(resolvedSession);
      }
      setIsAuthBusy(false);
      return resolvedSession;
    },
    [maybeClaimPendingHandle, refreshData]
  );

  React.useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const nextViewerSessionId = getOrCreateViewerSessionId();
        const { session: safeSession } = hasSupabaseConfig ? await getSafeSession() : { session: null };

        if (!active) {
          return;
        }

        setViewerSessionId(nextViewerSessionId);
        await applySession(safeSession ?? null, {
          deferRefresh: true,
          keepAuthModalOpen: !hasAnonymousHandle(safeSession?.user),
        });
      } catch (error) {
        if (active) {
          setErrorMessage(error?.message ?? 'Zazaspot could not restore the saved session.');
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) {
        return;
      }

      if (event === 'SIGNED_IN' && nextSession?.user?.id) {
        captureAnalyticsEvent('auth session started', {
          auth_provider: 'google',
          has_anonymous_handle: hasAnonymousHandle(nextSession.user),
        });
      }

      if (event === 'SIGNED_OUT') {
        captureAnalyticsEvent('auth session ended');
      }

      applySession(nextSession ?? null).catch(() => undefined);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  React.useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return undefined;
    }

    let active = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) {
          return;
        }

        setUserRegion(createRegionFromLocation(position.coords));
      },
      () => undefined,
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000,
      }
    );

    return () => {
      active = false;
    };
  }, []);

  const selectedPlace = React.useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  );
  const focusedPlace = React.useMemo(
    () => places.find((place) => place.id === focusedPlaceId) ?? null,
    [focusedPlaceId, places]
  );
  const effectiveVotes = React.useMemo(
    () => applyOptimisticVotes(votes, optimisticPlaceVotes, 'placeId'),
    [optimisticPlaceVotes, votes]
  );
  const effectiveCommentVotes = React.useMemo(
    () => applyOptimisticVotes(commentVotes, optimisticCommentVotes, 'commentId'),
    [commentVotes, optimisticCommentVotes]
  );
  const filteredPlaces = React.useMemo(
    () => places.filter((place) => doesPlaceMatchTagFilter(place.tag, activeTagFilters)),
    [activeTagFilters, places]
  );
  const visiblePlaces = React.useMemo(
    () =>
      getMapPlacesForRegion(filteredPlaces, mapRegion, effectiveVotes, selectedPlaceId).map((place) => ({
        ...place,
        voteBreakdown: getVoteBreakdown(effectiveVotes, place.id),
      })),
    [effectiveVotes, filteredPlaces, mapRegion, selectedPlaceId]
  );
  const availableTagFilters = React.useMemo(() => {
    return PLACE_TAG_FILTER_OPTIONS.map((option) => option.label);
  }, []);
  const comments = React.useMemo(
    () => getCommentsForPlace(allComments, selectedPlace?.id),
    [allComments, selectedPlace]
  );
  const commentThreads = React.useMemo(
    () => getCommentThreadsForPlace(allComments, selectedPlace?.id),
    [allComments, selectedPlace]
  );
  const voteBreakdown = React.useMemo(
    () => getVoteBreakdown(effectiveVotes, selectedPlace?.id),
    [effectiveVotes, selectedPlace]
  );
  const commentVoteState = React.useMemo(() => {
    const scoreByCommentId = {};
    const currentVoteByCommentId = {};

    effectiveCommentVotes.forEach((vote) => {
      scoreByCommentId[vote.commentId] = (scoreByCommentId[vote.commentId] ?? 0) + vote.value;

      if (vote.userId === session?.user?.id) {
        currentVoteByCommentId[vote.commentId] = vote.value;
      }
    });

    return {
      currentVoteByCommentId,
      scoreByCommentId,
    };
  }, [effectiveCommentVotes, session?.user?.id]);
  const currentVote = React.useMemo(() => {
    return getCurrentVoteValue(effectiveVotes, 'placeId', selectedPlace?.id, session?.user?.id);
  }, [effectiveVotes, selectedPlace, session]);

  const trackPlaceOpen = React.useCallback(
    (placeId, sourceScreen) => {
      if (!viewerSessionId || !hasSupabaseConfig) {
        return;
      }

      createPlaceOpenEvent({
        placeId,
        userId: session?.user?.id ?? null,
        viewerSessionId,
        sourceScreen,
      }).catch(() => undefined);
    },
    [session?.user?.id, viewerSessionId]
  );

  const openPlacePage = React.useCallback(
    (placeId, options = {}) => {
      const place = options.place ?? places.find((candidate) => candidate.id === placeId);

      if (!place) {
        return;
      }

      setSelectedPlaceId(place.id);
      setIsAddMode(false);
      setIsComposerModalVisible(false);
      setCommentDraft('');
      setReplyTarget(null);

      if (options.recenter) {
        setFocusedPlaceId(place.id);
      }

      navigateToRoute(
        {
          placeId: place.id,
          view: 'place',
        },
        {
          replace: options.replaceHistory,
        }
      );

      trackPlaceOpen(place.id, options.sourceScreen ?? 'web_place_page');
      captureAnalyticsEvent('place detail opened', {
        place_id: place.id,
        place_tag: place.tag,
        source_screen: options.sourceScreen ?? 'web_place_page',
      });
    },
    [navigateToRoute, places, trackPlaceOpen]
  );

  const closePlacePanel = React.useCallback(() => {
    setSelectedPlaceId('');
    setFocusedPlaceId('');
    navigateToRoute({ placeId: '', view: 'map' });
  }, [navigateToRoute]);

  const selectPlace = React.useCallback(
    (placeId, options = {}) => {
      const place = places.find((candidate) => candidate.id === placeId);

      if (!place) {
        return;
      }

      setSelectedPlaceId(place.id);
      setIsAddMode(false);

      if (options.recenter) {
        setFocusedPlaceId(place.id);
      }

      if (options.openModal !== false) {
        openPlacePage(place.id, {
          recenter: false,
          replaceHistory: options.replaceHistory,
          sourceScreen: options.sourceScreen ?? 'web_home_pin_page',
        });
        return;
      }
    },
    [openPlacePage, places]
  );

  const openAuthModal = React.useCallback(() => {
    setIsComposerModalVisible(false);
    setIsAddSheetVisible(false);
    setCommentDraft('');
    setReplyTarget(null);
    setIsAuthModalVisible(true);
    captureAnalyticsEvent('auth modal opened');
  }, []);

  const closeComposer = React.useCallback(() => {
    setIsComposerModalVisible(false);
    setCommentDraft('');
    setReplyTarget(null);
  }, []);

  const handleOpenLocation = React.useCallback(() => {
    if (!selectedPlace) {
      return;
    }

    captureAnalyticsEvent('place location opened', {
      place_id: selectedPlace.id,
      place_tag: selectedPlace.tag,
    });
    window.open(openLocationHref(selectedPlace), '_blank', 'noreferrer');
  }, [selectedPlace]);

  const handleVote = React.useCallback(
    async (value) => {
      if (!isAuthenticated || !selectedPlace || !session?.user?.id) {
        openAuthModal();
        return;
      }

      const placeId = selectedPlace.id;
      const userId = session.user.id;
      const voteKey = getVoteKey(placeId, userId);
      const nextOptimisticValue = currentVote === value ? 0 : value;
      const nextRequestVersion = (placeVoteRequestVersionRef.current[voteKey] ?? 0) + 1;

      placeVoteRequestVersionRef.current[voteKey] = nextRequestVersion;
      setOptimisticPlaceVotes((currentVotes) => ({
        ...currentVotes,
        [voteKey]: {
          entityId: placeId,
          userId,
          value: nextOptimisticValue,
        },
      }));

      try {
        await voteForPlace({
          placeId,
          userId,
          value,
        });

        if (placeVoteRequestVersionRef.current[voteKey] !== nextRequestVersion) {
          return;
        }

        setVotes((currentVotes) =>
          applyVoteOverride(currentVotes, {
            entityId: placeId,
            entityKey: 'placeId',
            userId,
            value: nextOptimisticValue,
          })
        );
        setOptimisticPlaceVotes((currentVotes) => {
          const nextVotes = { ...currentVotes };
          delete nextVotes[voteKey];
          return nextVotes;
        });
        setErrorMessage('');
        captureAnalyticsEvent('place vote changed', {
          place_id: placeId,
          place_tag: selectedPlace.tag,
          vote_value: nextOptimisticValue,
        });
      } catch (error) {
        if (placeVoteRequestVersionRef.current[voteKey] !== nextRequestVersion) {
          return;
        }

        setOptimisticPlaceVotes((currentVotes) => {
          const nextVotes = { ...currentVotes };
          delete nextVotes[voteKey];
          return nextVotes;
        });
        setErrorMessage(error?.message ?? 'Vote failed.');
      }
    },
    [currentVote, isAuthenticated, openAuthModal, selectedPlace, session]
  );

  const openComposer = React.useCallback(
    (nextReplyTarget = null) => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }

      setReplyTarget(nextReplyTarget);
      setCommentDraft(nextReplyTarget ? `@${nextReplyTarget.authorName || 'Zazaspot user'} ` : '');
      setIsComposerModalVisible(true);
      captureAnalyticsEvent('comment composer opened', {
        is_reply: Boolean(nextReplyTarget),
        place_id: selectedPlace?.id ?? null,
      });
    },
    [isAuthenticated, openAuthModal, selectedPlace?.id]
  );

  const handleSubmitComment = React.useCallback(async () => {
    if (!selectedPlace) {
      return;
    }

    if (!isAuthenticated || !session?.user) {
      closeComposer();
      openAuthModal();
      return;
    }

    if (!hasAnonymousHandle(session.user)) {
      closeComposer();
      setAuthNoticeMessage('Choose an anonymous name before posting or adding places.');
      setIsAuthModalVisible(true);
      captureAnalyticsEvent('anonymous handle required', {
        source: 'comment_submit',
      });
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
        parentCommentId: replyTarget?.id ?? null,
        user: session.user,
        body: commentDraft,
      });
      await refreshData(session);
      setErrorMessage('');
      closeComposer();
      captureAnalyticsEvent('comment created', {
        comment_length: commentDraft.trim().length,
        is_reply: Boolean(replyTarget),
        place_id: selectedPlace.id,
      });
    } catch (error) {
      setErrorMessage(error?.message ?? 'Comment failed.');
    } finally {
      setIsSubmittingComment(false);
    }
  }, [closeComposer, commentDraft, isAuthenticated, openAuthModal, refreshData, selectedPlace, session]);

  const handleCommentVote = React.useCallback(
    async (commentId, value) => {
      if (!isAuthenticated || !session?.user?.id) {
        openAuthModal();
        return;
      }

      const userId = session.user.id;
      const voteKey = getVoteKey(commentId, userId);
      const currentCommentVote = getCurrentVoteValue(
        effectiveCommentVotes,
        'commentId',
        commentId,
        userId
      );
      const nextOptimisticValue = currentCommentVote === value ? 0 : value;
      const nextRequestVersion = (commentVoteRequestVersionRef.current[voteKey] ?? 0) + 1;

      commentVoteRequestVersionRef.current[voteKey] = nextRequestVersion;
      setOptimisticCommentVotes((currentVotes) => ({
        ...currentVotes,
        [voteKey]: {
          entityId: commentId,
          userId,
          value: nextOptimisticValue,
        },
      }));

      try {
        await voteForComment({
          commentId,
          userId,
          value,
        });

        if (commentVoteRequestVersionRef.current[voteKey] !== nextRequestVersion) {
          return;
        }

        setCommentVotes((currentVotes) =>
          applyVoteOverride(currentVotes, {
            entityId: commentId,
            entityKey: 'commentId',
            userId,
            value: nextOptimisticValue,
          })
        );
        setOptimisticCommentVotes((currentVotes) => {
          const nextVotes = { ...currentVotes };
          delete nextVotes[voteKey];
          return nextVotes;
        });
        setErrorMessage('');
        captureAnalyticsEvent('comment vote changed', {
          comment_id: commentId,
          place_id: selectedPlace?.id ?? null,
          vote_value: nextOptimisticValue,
        });
      } catch (error) {
        if (commentVoteRequestVersionRef.current[voteKey] !== nextRequestVersion) {
          return;
        }

        setOptimisticCommentVotes((currentVotes) => {
          const nextVotes = { ...currentVotes };
          delete nextVotes[voteKey];
          return nextVotes;
        });
        setErrorMessage(error?.message ?? 'Comment vote failed.');
      }
    },
    [effectiveCommentVotes, isAuthenticated, openAuthModal, session]
  );

  const handleGoogleSignIn = React.useCallback(async () => {
    if (!supabase) {
      setErrorMessage('Supabase is not configured for browser auth.');
      return;
    }

    try {
      setIsAuthBusy(true);
      setErrorMessage('');
      setAuthNoticeMessage('');
      captureAnalyticsEvent('google sign in requested', {
        auth_provider: 'google',
      });
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getWebAuthRedirectUrl(),
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setErrorMessage(error?.message ?? 'Google sign-in failed.');
      setIsAuthBusy(false);
    }
  }, []);

  const handleClaimHandle = React.useCallback(async ({ handle }) => {
    if (!session?.user) {
      setErrorMessage('Login required before choosing an anonymous name.');
      return;
    }

    const normalizedHandle = normalizeAnonymousUsername(handle);

    if (normalizedHandle.length < 3) {
      setErrorMessage('Choose an anonymous name with at least 3 characters.');
      return;
    }

    try {
      setIsAuthBusy(true);
      setErrorMessage('');
      setAuthNoticeMessage('');
      writePendingAnonymousHandle(normalizedHandle);
      const claimedHandle = await claimAnonymousHandle({
        user: session.user,
        handle: normalizedHandle,
      });
      writePendingAnonymousHandle('');
      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              user: {
                ...currentSession.user,
                user_metadata: {
                  ...(currentSession.user.user_metadata ?? {}),
                  preferred_username: claimedHandle,
                },
              },
            }
          : currentSession
      );
      setIsAuthModalVisible(false);
      captureAnalyticsEvent('anonymous handle claimed', {
        claim_source: 'auth_modal',
        handle_length: claimedHandle.length,
      });
    } catch (error) {
      setErrorMessage(error?.message ?? 'Anonymous name setup failed.');
      setAuthNoticeMessage('Pick a different anonymous name to continue.');
    } finally {
      setIsAuthBusy(false);
    }
  }, [session]);

  const handleSignOut = React.useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setIsAuthModalVisible(false);
      return;
    }

    try {
      await supabase.auth.signOut();
      writePendingAnonymousHandle('');
      setSession(null);
      setIsAuthModalVisible(false);
      setAuthNoticeMessage('');
      await refreshData(null);
    } catch (error) {
      setErrorMessage(error?.message ?? 'Sign-out failed.');
    }
  }, [refreshData]);

  const beginAddPlace = React.useCallback(() => {
    navigateToRoute({ placeId: '', view: 'map' });
    setAddPinCoordinates({
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
    });
    setIsAddMode(true);
    setIsComposerModalVisible(false);
    setSelectedPlaceId('');
    setFocusedPlaceId('');
    setCommentDraft('');
    setReplyTarget(null);
    captureAnalyticsEvent('place add flow started');
  }, [mapRegion.latitude, mapRegion.longitude, navigateToRoute]);
  const handleOpenSelected = React.useCallback(() => {
    if (selectedPlaceId) {
      openPlacePage(selectedPlaceId, {
        sourceScreen: 'web_keyboard_selection',
      });
    }
  }, [openPlacePage, selectedPlaceId]);

  const cancelAddPlace = React.useCallback(() => {
    setIsAddMode(false);
    setIsAddSheetVisible(false);
    setNewPlaceName('');
    setNewPlaceDescription('');
    setNewPlaceTagOption(PLACE_TAG_PRESET_OPTIONS[0]?.value ?? 'zaza_spots');
    setNewPlaceCustomTag('');
    setNewPlacePhotos([]);
  }, []);

  const handlePhotoInputChange = React.useCallback((event) => {
    const nextFiles = Array.from(event.target.files ?? []);

    if (nextFiles.length > MAX_PLACE_PHOTO_UPLOADS) {
      setErrorMessage(`Choose up to ${MAX_PLACE_PHOTO_UPLOADS} photos per place.`);
      setNewPlacePhotos(nextFiles.slice(0, MAX_PLACE_PHOTO_UPLOADS));
      return;
    }

    setErrorMessage('');
    setNewPlacePhotos(nextFiles);
  }, []);

  const handleCreatePlace = React.useCallback(async () => {
    if (!newPlaceName.trim() || !newPlaceDescription.trim() || !resolvedNewPlaceTag) {
      setErrorMessage('Add a name, description, and tag before saving the place.');
      return;
    }

    if (!isAuthenticated || !session?.user) {
      setIsAddSheetVisible(false);
      openAuthModal();
      return;
    }

    if (!hasAnonymousHandle(session.user)) {
      setIsAddSheetVisible(false);
      setAuthNoticeMessage('Choose an anonymous name before posting or adding places.');
      setIsAuthModalVisible(true);
      captureAnalyticsEvent('anonymous handle required', {
        source: 'place_create',
      });
      return;
    }

    try {
      setIsSavingPlace(true);
      const photoUrls = newPlacePhotos.length
        ? await uploadPlacePhotos({
            files: newPlacePhotos,
            user: session.user,
          })
        : [];
      await createPlace({
        user: session.user,
        name: newPlaceName,
        description: newPlaceDescription,
        latitude: addPinCoordinates.latitude,
        longitude: addPinCoordinates.longitude,
        photoUrls,
        tag: resolvedNewPlaceTag,
      });

      await refreshData(session);
      setNewPlaceName('');
      setNewPlaceDescription('');
      setNewPlaceTagOption(PLACE_TAG_PRESET_OPTIONS[0]?.value ?? 'zaza_spots');
      setNewPlaceCustomTag('');
      setNewPlacePhotos([]);
      setIsAddSheetVisible(false);
      setIsAddMode(false);
      setErrorMessage('');
      setSuccessMessage('Place added successfully.');
      captureAnalyticsEvent('place created', {
        has_custom_tag: isCustomTagSelected,
        photo_count: photoUrls.length,
        place_name_length: newPlaceName.trim().length,
        place_tag: resolvedNewPlaceTag,
      });
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
    newPlacePhotos,
    openAuthModal,
    refreshData,
    resolvedNewPlaceTag,
    session,
    isCustomTagSelected,
  ]);

  const toggleTagFilter = React.useCallback((tagLabel) => {
    const isSelected = activeTagFilters.includes(tagLabel);

    setActiveTagFilters((currentFilters) =>
      currentFilters.includes(tagLabel)
        ? currentFilters.filter((tag) => tag !== tagLabel)
        : [...currentFilters, tagLabel]
    );
    captureAnalyticsEvent('tag filter changed', {
      is_selected: !isSelected,
      tag_label: tagLabel,
    });
  }, [activeTagFilters]);

  const clearTagFilters = React.useCallback(() => {
    setActiveTagFilters([]);
    captureAnalyticsEvent('tag filters cleared');
  }, []);

  const handleDeletePlace = React.useCallback(async (placeId) => {
    if (!isAuthenticated || !session?.user) {
      openAuthModal();
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this place?')) {
      return;
    }

    try {
      await deletePlace({ user: session.user, placeId });
      setErrorMessage('');
      closePlacePanel();
      await refreshData();
      captureAnalyticsEvent('place deleted', {
        place_id: placeId,
      });
    } catch (error) {
      setErrorMessage(error?.message ?? 'Delete failed.');
    }
  }, [isAuthenticated, session, openAuthModal, closePlacePanel, refreshData]);

  const handleToggleSavePlace = React.useCallback(async (placeId, isCurrentlySaved) => {
    if (!isAuthenticated || !session?.user) {
      openAuthModal();
      return;
    }

    try {
      if (isCurrentlySaved) {
        await unsavePlace({ user: session.user, placeId });
      } else {
        await savePlace({ user: session.user, placeId });
      }
      await refreshData();
      captureAnalyticsEvent(isCurrentlySaved ? 'place unsaved' : 'place saved', {
        place_id: placeId,
      });
    } catch (error) {
      setErrorMessage(error?.message ?? 'Unable to save place.');
    }
  }, [isAuthenticated, session, openAuthModal, refreshData]);

  const handleOpenFeedback = React.useCallback(() => {
    setIsAuthModalVisible(false);
    setIsComposerModalVisible(false);
    setIsAddSheetVisible(false);
    setFeedbackErrorMessage('');
    setIsFeedbackModalVisible(true);
    captureAnalyticsEvent('feedback modal opened', {
      place_id: selectedPlace?.id ?? null,
      screen_name: appRoute.view === 'place' ? 'place_detail' : 'map_home',
    });
  }, [appRoute.view, selectedPlace?.id]);

  const closeFeedbackModal = React.useCallback(() => {
    setIsFeedbackModalVisible(false);
    setFeedbackDraft('');
    setFeedbackErrorMessage('');
    setIsSubmittingFeedback(false);
  }, []);

  const handleSubmitFeedback = React.useCallback(async () => {
    if (!feedbackDraft.trim()) {
      setFeedbackErrorMessage('Write a short note before sending feedback.');
      return;
    }

    try {
      setIsSubmittingFeedback(true);
      setFeedbackErrorMessage('');
      await createFeedbackSubmission({
        body: feedbackDraft,
        pagePath: typeof window === 'undefined' ? '/' : window.location.pathname,
        placeId: selectedPlace?.id ?? null,
        sourceScreen: appRoute.view === 'place' ? 'place_detail_feedback' : 'map_home_feedback',
        userId: session?.user?.id ?? null,
        viewerSessionId,
      });
      captureAnalyticsEvent('feedback submitted', {
        has_place_context: Boolean(selectedPlace?.id),
        message_length: feedbackDraft.trim().length,
        screen_name: appRoute.view === 'place' ? 'place_detail' : 'map_home',
      });
      setErrorMessage('');
      setSuccessMessage('Feedback sent.');
      closeFeedbackModal();
    } catch (error) {
      setFeedbackErrorMessage(error?.message ?? 'Feedback failed to send.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [appRoute.view, closeFeedbackModal, feedbackDraft, selectedPlace?.id, session?.user?.id, viewerSessionId]);

  const topControls = isAddMode ? (
    <div className="hud-row">
      <AppButton label="Back" variant="secondary" size="compact" onClick={cancelAddPlace} />
    </div>
  ) : (
    <div className="hud-row hud-row-end">
      <div
        className={`tag-filter-control${isTagMenuOpen ? ' is-open' : ''}`}
        ref={tagMenuRef}
      >
        <button
          className="tag-filter-button"
          data-testid="tag-filter-button"
          type="button"
          aria-expanded={isTagMenuOpen}
          aria-haspopup="menu"
          onClick={() => setIsTagMenuOpen((currentValue) => !currentValue)}
        >
          <span>{tagButtonLabel}</span>
        </button>
        {isTagMenuOpen ? (
          <div className="tag-filter-menu" data-testid="tag-filter-menu" role="menu">
            <div className="tag-filter-menu-header">
              <p className="tag-filter-title">Tags</p>
              <button
                className="tag-filter-clear"
                data-testid="tag-filter-clear"
                type="button"
                onClick={clearTagFilters}
              >
                Show all
              </button>
            </div>
            <div className="tag-filter-options">
              {availableTagFilters.map((tagLabel) => (
                <label className="tag-filter-option" key={tagLabel}>
                  <input
                    checked={activeTagFilters.includes(tagLabel)}
                    data-testid={`tag-filter-option-${tagLabel}`}
                    onChange={() => toggleTagFilter(tagLabel)}
                    type="checkbox"
                  />
                  <span>{tagLabel}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <AppButton
        label={isAuthenticated ? 'Profile' : 'Sign in'}
        variant="secondary"
        size="compact"
        onClick={openAuthModal}
        testId="account-button"
      />
    </div>
  );
  const hasActiveModal =
    isAuthModalVisible || isComposerModalVisible || isAddSheetVisible || isFeedbackModalVisible;

  if (!isHydrated) {
    return (
      <div
        className="loading-screen"
        data-color-mode={colorMode}
        style={{
          '--color-background': webShellColors.background,
          '--color-card': webShellColors.card,
          '--color-text': webShellColors.text,
          '--color-muted': webShellColors.mutedText,
          '--color-border': webShellColors.border,
          '--color-focus-ring': webShellColors.focusRing,
          '--color-grid-line': webShellColors.gridLine,
          '--color-loading-gradient-start': webShellColors.loadingGradientStart,
          '--color-loading-gradient-end': webShellColors.loadingGradientEnd,
          colorScheme: colorMode,
        }}
      >
        <div className="loading-title">{APP_NAME}</div>
        <p className="loading-copy">Loading the map faster and syncing the latest spots.</p>
        <p className="loading-copy loading-copy-tagline">{APP_TAGLINE}</p>
      </div>
    );
  }

  return (
    <div
      className={`app-shell${hasActiveModal ? ' has-modal' : ''}`}
      data-color-mode={colorMode}
      style={{
        '--color-background': webShellColors.background,
        '--color-card': webShellColors.card,
        '--color-elevated': webShellColors.elevatedCard,
        '--color-border': webShellColors.border,
        '--color-separator': webShellColors.separator,
        '--color-text': webShellColors.text,
        '--color-muted': webShellColors.mutedText,
        '--color-primary': webShellColors.primary,
        '--color-primary-text': webShellColors.primaryText,
        '--color-accent': webShellColors.accent,
        '--color-accent-text': webShellColors.accentText,
        '--color-backdrop': webShellColors.sheetBackdrop,
        '--color-handle': webShellColors.handle,
        '--color-focus-ring': webShellColors.focusRing,
        '--color-grid-line': webShellColors.gridLine,
        '--color-loading-gradient-start': webShellColors.loadingGradientStart,
        '--color-loading-gradient-end': webShellColors.loadingGradientEnd,
        '--color-page-grid-line': webShellColors.pageGridLine,
        '--color-page-gradient-start': webShellColors.pageGradientStart,
        '--color-page-gradient-end': webShellColors.pageGradientEnd,
        '--color-page-glow-a': webShellColors.pageDecorativeGlowA,
        '--color-page-glow-b': webShellColors.pageDecorativeGlowB,
        '--color-page-glare-a': webShellColors.pageGlareA,
        '--color-page-glare-b': webShellColors.pageGlareB,
        '--color-meta-dot': webShellColors.metaDot,
        '--color-summary-dot': webShellColors.summaryDot,
        '--color-map-surface': webShellColors.mapSurfaceBackground,
        '--color-map-tooltip-background': webShellColors.mapTooltipBackground,
        '--color-map-tooltip-border': webShellColors.mapTooltipBorder,
        '--color-map-tooltip-shadow': webShellColors.mapTooltipShadow,
        '--color-map-tooltip-text': webShellColors.mapTooltipText,
        '--color-map-tooltip-button-background': webShellColors.mapTooltipButtonBackground,
        '--color-map-tooltip-button-text': webShellColors.mapTooltipButtonText,
        '--color-map-loading-background-a': webShellColors.mapLoadingBackgroundA,
        '--color-map-loading-background-b': webShellColors.mapLoadingBackgroundB,
        '--color-map-loading-background-base': webShellColors.mapLoadingBackgroundBase,
        '--color-map-loading-border': webShellColors.mapLoadingBorder,
          '--color-map-loading-shadow': webShellColors.mapLoadingShadow,
        '--color-map-attribution-background': webShellColors.mapAttributionBackground,
        '--color-map-attribution-shadow': webShellColors.mapAttributionShadow,
        '--color-preview-fade-mid': webShellColors.previewFadeMid,
        '--color-preview-fade-end': webShellColors.previewFadeEnd,
        '--color-shadow-strong': webShellColors.shadowStrong,
        '--color-shadow-contrast': webShellColors.shadowContrast,
        colorScheme: colorMode,
      }}
    >
      <div className="sr-only" id={helpId}>
        Drag or two-finger scroll to pan. Pinch or scroll to zoom. Arrow keys and plus or minus
        keys work when the map is focused, and Page Up / Page Down move between visible places.
      </div>

      <main
        aria-hidden={hasActiveModal}
        className={`map-screen${isAddMode ? ' is-add-mode' : ''}${
          isPlacePanelVisible ? ' has-place-panel' : ''
        }`}
      >
        <DesktopMap
          addMode={isAddMode}
          addPinCoordinates={addPinCoordinates}
          colorMode={colorMode}
          focusedPlace={focusedPlace}
          onAddPinChange={setAddPinCoordinates}
          onOpenSelected={handleOpenSelected}
          onRegionChange={setMapRegion}
          onSelectPlace={selectPlace}
          selectedPlaceId={selectedPlaceId}
          userRegion={userRegion}
          visiblePlaces={visiblePlaces}
        />

        {isPlacePanelVisible ? (
          <PlacePage
            commentThreads={commentThreads}
            comments={comments}
            commentVoteState={commentVoteState}
            currentVote={currentVote}
            onBackToMap={closePlacePanel}
            onCommentVote={handleCommentVote}
            onCompose={openComposer}
            onOpenLocation={handleOpenLocation}
            onVote={handleVote}
            onDeletePlace={handleDeletePlace}
            onToggleSave={handleToggleSavePlace}
            isOwner={session?.user?.id && selectedPlace?.createdBy === session.user.id}
            isSaved={savedPlaces.some(s => s.placeId === selectedPlace?.id && s.userId === session?.user?.id)}
            overlay
            place={selectedPlace}
            voteBreakdown={voteBreakdown}
          />
        ) : null}

        <div className="map-hud map-hud-top">{topControls}</div>

        {isAddMode ? (
          <div className="map-hud map-hud-bottom">
            <div className="bottom-add-action">
              <AppButton
                label="Add Place"
                size="default"
                onClick={() => setIsAddSheetVisible(true)}
                styleClassName="bottom-add-action-button"
                testId="add-place-bottom-button"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="map-hud map-hud-bottom-left">
              <button
                aria-label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="theme-icon-button"
                data-testid="theme-toggle-button"
                type="button"
                onClick={() => setColorMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'))}
              >
                <span aria-hidden="true">{colorMode === 'dark' ? '☀' : '☾'}</span>
              </button>
            </div>
            <div className="map-hud map-hud-bottom-right">
              <button
                aria-label="Send feedback"
                className="feedback-icon-button"
                data-testid="feedback-button"
                type="button"
                onClick={handleOpenFeedback}
              >
                <span aria-hidden="true">✉</span>
              </button>
            </div>
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
          </>
        )}

        {errorMessage && !isAuthModalVisible ? <div className="status-banner">{errorMessage}</div> : null}
        {successMessage && !isAuthModalVisible ? (
          <div className="status-banner is-success">{successMessage}</div>
        ) : null}
      </main>

      {isAuthModalVisible ? (
        <SheetModal
          dialogClassName="sheet-auth"
          onClose={() => setIsAuthModalVisible(false)}
        >
          {isAuthenticated && canPostAnonymously ? (
            <div className="sheet-header">
              <div className="sheet-handle" />
              <p className="sheet-kicker">Account</p>
              <h2 className="sheet-title">Profile</h2>
              <div className="profile-name">{formatUserHandle(currentUser.name)}</div>
              
              <div style={{ marginTop: '24px', marginBottom: '24px', textAlign: 'left', width: '100%' }}>
                <p className="sheet-kicker" style={{ marginBottom: '8px' }}>Saved Places</p>
                {savedPlaces.length === 0 ? (
                  <p className="sheet-copy" style={{ margin: 0 }}>No saved places.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                    {savedPlaces.map(saved => {
                      const sp = places.find(p => p.id === saved.placeId);
                      if (!sp) return null;
                      return (
                        <button
                          key={saved.id}
                          className="text-button"
                          type="button"
                          style={{ textAlign: 'left', padding: '4px 0', fontSize: '15px' }}
                          onClick={() => {
                            setIsAuthModalVisible(false);
                            navigateToRoute({ placeId: sp.id, view: 'map' });
                            setSelectedPlaceId(sp.id);
                            setMapRegion({ latitude: sp.latitude, longitude: sp.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
                          }}
                        >
                          {sp.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <AppButton
                label="Sign out"
                size="default"
                onClick={handleSignOut}
                styleClassName="auth-signout-button"
              />
            </div>
          ) : isAuthenticated ? (
            <HandleClaimCard
              authBusy={isAuthBusy}
              errorMessage={errorMessage}
              helperText={authNoticeMessage}
              initialHandle={readPendingAnonymousHandle() || currentAnonymousHandle}
              onClaimHandle={handleClaimHandle}
            />
          ) : (
            <GoogleAuthCard
              authBusy={isAuthBusy}
              errorMessage={errorMessage}
              helperText={authNoticeMessage}
              onGoogleSignIn={handleGoogleSignIn}
            />
          )}
        </SheetModal>
      ) : null}

      {isComposerModalVisible ? (
        <SheetModal onClose={() => closeComposer()}>
          <div className="sheet-header">
            <div className="sheet-handle" />
            <p className="sheet-kicker">{replyTarget ? 'Reply' : 'New comment'}</p>
            <h2 className="sheet-title">
              {replyTarget ? `Reply to ${formatUserHandle(replyTarget.authorName)}` : 'Add a comment'}
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
              onClick={() => closeComposer()}
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
            <p className="sheet-kicker">Submit a place</p>
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
          <label className="sheet-field">
            <span className="sheet-field-label">Tag</span>
            <select
              className="sheet-input sheet-select"
              data-testid="place-tag-select"
              value={newPlaceTagOption}
              onChange={(event) => setNewPlaceTagOption(event.target.value)}
            >
              {PLACE_TAG_PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {isCustomTagSelected ? (
            <input
              className="sheet-input"
              data-testid="place-custom-tag-input"
              placeholder="Custom tag"
              value={newPlaceCustomTag}
              onChange={(event) => setNewPlaceCustomTag(event.target.value)}
            />
          ) : null}
          <label className="sheet-field">
            <span className="sheet-field-label">Photos</span>
            <input
              className="sheet-input sheet-file-input"
              data-testid="place-photo-input"
              accept="image/*"
              multiple
              type="file"
              onChange={handlePhotoInputChange}
            />
          </label>
          {newPlacePhotos.length ? (
            <div className="photo-list-card">
              <div className="coords-label">Selected photos</div>
              <ul className="photo-list">
                {newPlacePhotos.map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name}</li>
                ))}
              </ul>
            </div>
          ) : null}

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

      {isFeedbackModalVisible ? (
        <SheetModal dialogClassName="sheet-feedback" onClose={closeFeedbackModal}>
          <div className="sheet-header">
            <div className="sheet-handle" />
            <p className="sheet-kicker">Feedback</p>
            <h2 className="sheet-title">Send feedback</h2>
            <p className="sheet-copy">
              Tell us what happened, what feels off, or what should change.
            </p>
          </div>

          <textarea
            autoFocus
            className="composer-input"
            placeholder="What should we fix or improve?"
            value={feedbackDraft}
            onChange={(event) => setFeedbackDraft(event.target.value)}
          />

          {feedbackErrorMessage ? <p className="sheet-meta">{feedbackErrorMessage}</p> : null}

          <div className="composer-actions">
            <button className="text-button" type="button" onClick={closeFeedbackModal}>
              Cancel
            </button>
            <AppButton
              label={isSubmittingFeedback ? 'Sending' : 'Send'}
              size="compact"
              onClick={handleSubmitFeedback}
            />
          </div>
        </SheetModal>
      ) : null}
    </div>
  );
}

function SheetModal({ children, dialogClassName = '', onClose, tall = false }) {
  return (
    <div className="modal-root" role="dialog" aria-modal="true">
      <button className="modal-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <div className={`sheet${tall ? ' sheet-tall' : ''}${dialogClassName ? ` ${dialogClassName}` : ''}`}>
        <button className="modal-close-button" type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
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

function PlacePage({
  commentThreads,
  comments,
  commentVoteState,
  currentVote,
  onBackToMap,
  onCommentVote,
  onCompose,
  onOpenLocation,
  onVote,
  onDeletePlace,
  onToggleSave,
  isOwner = false,
  isSaved = false,
  overlay = false,
  place,
  voteBreakdown,
}) {
  const commentCount = place?.threadCount ?? comments.length;
  const RootTag = overlay ? 'aside' : 'main';
  const rootClassName = `place-page${overlay ? ' is-overlay' : ''}`;

  if (!place) {
    return (
      <RootTag
        className={rootClassName}
        {...(overlay ? { 'aria-label': 'Place details panel' } : {})}
      >
        <div className="place-page-shell">
          <div className="place-page-nav">
            <button
              aria-label="Close place details"
              className="page-nav-button is-icon"
              type="button"
              onClick={onBackToMap}
            >
              ×
            </button>
          </div>

          <section className="place-page-card place-page-empty-card">
            <p className="place-page-kicker">{APP_NAME}</p>
            <h1 className="place-page-title">Place not found</h1>
            <p className="place-page-copy">
              This place link does not match anything in the current dataset.
            </p>
          </section>
        </div>
      </RootTag>
    );
  }

  return (
    <RootTag
      className={rootClassName}
      {...(overlay ? { 'aria-label': 'Place details panel' } : {})}
    >
      <div className="place-page-shell">
        <div className="place-page-nav">
          <button
            aria-label="Close place details"
            className="page-nav-button is-icon"
            type="button"
            onClick={onBackToMap}
          >
            ×
          </button>
        </div>

        <div className="place-page-stack">
          <article className="place-page-post">
            <div className="place-page-vote-aside">
              <VoteControls
                className="place-page-vote-bar"
                currentVote={currentVote}
                direction="vertical"
                onDownvote={() => onVote(-1)}
                onUpvote={() => onVote(1)}
                score={voteBreakdown.score}
              />
            </div>
            
            <div className="place-page-content place-page-post-content">
              <div className="place-page-meta-row">
                <span className="place-page-meta-dot">•</span>
                <span className="place-page-meta-inline">
                  Posted by {formatUserHandle(place.authorName)}
                </span>
                <span className="place-page-meta-dot">•</span>
                <span className="place-page-meta-inline">{formatRelativeTime(place.createdAt)}</span>
              </div>
              <h1 className="place-page-title">{place.name}</h1>
              <div className="place-page-tag-row">
                <PlaceTagChip tag={place.tag} />
              </div>

              <div className="place-page-summary-line">
                <span>{formatSignedValue(voteBreakdown.score)} points</span>
                <span>{commentCount} comments</span>
                <span>{voteBreakdown.ratioLabel} split</span>
              </div>

              <p className="place-page-copy">{place.description}</p>
              {place.photoUrls?.length ? (
                <div className="place-photo-grid">
                  {place.photoUrls.map((photoUrl, index) => (
                    <img
                      key={photoUrl}
                      alt={`${place.name} photo ${index + 1}`}
                      className="place-photo"
                      src={photoUrl}
                    />
                  ))}
                </div>
              ) : null}

              <div className="place-page-toolbar">
                <AppButton
                  label="Open location"
                  size="default"
                  onClick={onOpenLocation}
                  styleClassName="place-page-open-button"
                />
                <button className="place-page-thread-button" type="button" onClick={() => onCompose()}>
                  Comment
                </button>
                {onToggleSave ? (
                  <button className="place-page-thread-button" type="button" onClick={() => onToggleSave(place.id, isSaved)}>
                    {isSaved ? 'Unsave' : 'Save'}
                  </button>
                ) : null}
                {isOwner && onDeletePlace ? (
                  <button className="place-page-thread-button" type="button" onClick={() => onDeletePlace(place.id)}>
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          </article>

          <section className="place-page-comments">
            {commentThreads.length ? (
              <div className="thread-header place-page-thread-header">
                <div>
                  <h2 className="thread-title place-page-thread-title">Comments</h2>
                </div>
                <div className="place-page-comment-count">{comments.length} comments</div>
              </div>
            ) : null}
            <div className="discussion-list place-page-discussion-list">
              {commentThreads.length ? (
                commentThreads.map((commentThread) => (
                  <CommentThread
                    key={commentThread.id}
                    commentThread={commentThread}
                    commentVoteState={commentVoteState}
                    onCommentVote={onCommentVote}
                    onCompose={onCompose}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <strong>No discussion yet.</strong>
                  <p>Start the first comment for this place.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </RootTag>
  );
}

function PlaceTagChip({ tag }) {
  return <span className="place-tag-chip">{getPlaceTagLabel(tag)}</span>;
}

function VoteControls({
  className = '',
  currentVote,
  direction = 'vertical',
  onDownvote,
  onUpvote,
  score,
}) {
  return (
    <div className={`vote-controls is-${direction}${className ? ` ${className}` : ''}`}>
      <button
        className={`vote-arrow is-up${currentVote === 1 ? ' is-active' : ''}`}
        type="button"
        onClick={onUpvote}
        aria-label="Upvote place"
      >
        <span className={currentVote === 1 ? 'is-active' : ''}>▲</span>
      </button>
      <span className="vote-score">{formatSignedValue(score)}</span>
      <button
        className={`vote-arrow is-down${currentVote === -1 ? ' is-active' : ''}`}
        type="button"
        onClick={onDownvote}
        aria-label="Downvote place"
      >
        <span className={currentVote === -1 ? 'is-active' : ''}>▼</span>
      </button>
    </div>
  );
}

function CommentThread({
  commentThread,
  commentVoteState,
  depth = 0,
  isPreviewTail = false,
  onCommentVote,
  onOpenDiscussion,
  onCompose,
}) {
  const nestedReplies = commentThread.replies ?? [];
  const nextDepth = Math.min(depth, 3);

  return (
    <div className={`comment-thread depth-${nextDepth}${isPreviewTail ? ' is-preview-tail' : ''}`}>
      <CommentCard
        comment={commentThread}
        currentVote={commentVoteState.currentVoteByCommentId[commentThread.id] ?? 0}
        depth={nextDepth}
        onDownvote={() => onCommentVote(commentThread.id, -1)}
        onReply={() => onCompose(commentThread)}
        onUpvote={() => onCommentVote(commentThread.id, 1)}
        score={commentVoteState.scoreByCommentId[commentThread.id] ?? 0}
      />

      {nestedReplies.length ? (
        <div className="comment-replies">
          {nestedReplies.map((reply) => (
            <CommentThread
              key={reply.id}
              commentThread={reply}
              commentVoteState={commentVoteState}
              depth={nextDepth + 1}
              onCommentVote={onCommentVote}
              onCompose={onCompose}
            />
          ))}
        </div>
      ) : null}

      {isPreviewTail ? (
        <div className="preview-fade">
          <button className="see-more-button" type="button" onClick={onOpenDiscussion}>
            Continue thread
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CommentCard({
  comment,
  currentVote = 0,
  depth = 0,
  onDownvote,
  onReply,
  onUpvote,
  score,
}) {
  return (
    <article className={`comment-card depth-${Math.min(depth, 3)}`}>
      <div className="comment-vote-rail">
        <CommentArrowButton direction="up" isActive={currentVote === 1} onClick={onUpvote} />
        <span className="comment-score">{formatSignedValue(score)}</span>
        <CommentArrowButton direction="down" isActive={currentVote === -1} onClick={onDownvote} />
      </div>

      <div className="comment-content">
        <div className="comment-meta-row">
          <strong className="comment-author">{formatUserHandle(comment.authorName)}</strong>
          <span className="comment-meta-divider">•</span>
          <span className="comment-timestamp">{formatRelativeTime(comment.createdAt)}</span>
        </div>

        <p className="comment-body">{comment.body}</p>

        <div className="comment-actions">
          <button className="reply-button" type="button" onClick={onReply}>
            Reply
          </button>
          {comment.replies?.length ? (
            <span className="comment-reply-count">
              {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CommentArrowButton({ direction, isActive, onClick }) {
  return (
    <button
      className="comment-arrow"
      type="button"
      onClick={onClick}
      aria-label={direction === 'up' ? 'Upvote comment' : 'Downvote comment'}
    >
      <span className={isActive ? 'is-active' : ''}>{direction === 'up' ? '▲' : '▼'}</span>
    </button>
  );
}

function GoogleAuthCard({
  authBusy,
  errorMessage,
  helperText,
  onGoogleSignIn,
}) {
  return (
    <div className="auth-card">
      <p className="sheet-kicker">{APP_NAME}</p>
      <h2 className="sheet-title">Sign in</h2>
      <p className="sheet-copy">
        Sign in with Google to post comments and add places. Your real name and email are never shown to other users.
      </p>
      <p className="sheet-meta">{AUTH_PRIVACY_COPY}</p>

      <AppButton
        label={authBusy ? 'Signing in...' : 'Sign in with Google'}
        size="default"
        styleClassName="auth-submit-button auth-google-button"
        onClick={onGoogleSignIn}
      />
      {helperText ? <p className="sheet-meta">{helperText}</p> : null}
      {!helperText && errorMessage ? <p className="sheet-meta">{errorMessage}</p> : null}
    </div>
  );
}

function HandleClaimCard({
  authBusy,
  errorMessage,
  helperText,
  initialHandle = '',
  onClaimHandle,
}) {
  const [handle, setHandle] = React.useState(initialHandle);

  React.useEffect(() => {
    setHandle(initialHandle);
  }, [initialHandle]);

  return (
    <div className="auth-card">
      <p className="sheet-kicker">Finish setup</p>
      <h2 className="sheet-title">Choose your anonymous name</h2>
      <p className="sheet-copy">
        This is the only name other people will see when you comment, reply, or add places.
      </p>

      <input
        className="sheet-input"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="Anonymous name"
        value={handle}
        onChange={(event) => setHandle(event.target.value)}
      />
      <AppButton
        label={authBusy ? 'Saving...' : 'Save anonymous name'}
        size="default"
        styleClassName="auth-submit-button"
        onClick={() => onClaimHandle({ handle })}
      />
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

function formatUserHandle(name) {
  const normalized = `${name || 'Zazaspot user'}`
    .trim()
    .replace(/\s+/g, '_');

  return `u/${normalized}`;
}

function formatRelativeTime(value) {
  if (!value) {
    return 'just now';
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 'recently';
  }

  const diffInSeconds = Math.round((timestamp - Date.now()) / 1000);
  const units = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
  ];

  for (const { unit, seconds } of units) {
    if (Math.abs(diffInSeconds) >= seconds) {
      return RELATIVE_TIME_FORMATTER.format(
        Math.round(diffInSeconds / seconds),
        unit
      );
    }
  }

  return 'just now';
}
