import React from 'react';
import {
  getAnonymousHandle,
  getUserIdentity,
  hasAnonymousHandle,
  isLoggedIn,
  normalizeAnonymousUsername,
} from '@topey/shared/lib/auth';
import {
  DEFAULT_REGION,
  KATHMANDU_EXPLORE_REGION,
  PENDING_ANONYMOUS_HANDLE_KEY,
  VIEWER_SESSION_KEY,
} from '@topey/shared/lib/constants';
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
  createPlace,
  createPlaceOpenEvent,
  fetchAppData,
  voteForComment,
  voteForPlace,
} from './lib/backend';
import { getSafeSession, hasSupabaseConfig, supabase } from './lib/supabase';
import DesktopMap from './components/DesktopMap';
const WEB_SHELL_COLORS = {
  background: '#F4F4F5',
  card: '#FFFFFF',
  elevatedCard: '#FAFAFA',
  border: '#D4D4D8',
  separator: '#E4E4E7',
  text: '#18181B',
  mutedText: '#71717A',
  primary: '#18181B',
  primaryText: '#FFFFFF',
  accent: '#2563EB',
  sheetBackdrop: 'rgba(24, 24, 27, 0.16)',
  handle: '#A1A1AA',
};
const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

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
  const [votes, setVotes] = React.useState([]);
  const [allComments, setAllComments] = React.useState([]);
  const [commentVotes, setCommentVotes] = React.useState([]);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isAuthBusy, setIsAuthBusy] = React.useState(false);
  const [authNoticeMessage, setAuthNoticeMessage] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
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
  const [newPlaceName, setNewPlaceName] = React.useState('');
  const [newPlaceDescription, setNewPlaceDescription] = React.useState('');
  const [addPinCoordinates, setAddPinCoordinates] = React.useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [isSavingPlace, setIsSavingPlace] = React.useState(false);
  const placeVoteRequestVersionRef = React.useRef({});
  const commentVoteRequestVersionRef = React.useRef({});

  const currentUser = React.useMemo(() => getUserIdentity(session?.user), [session]);
  const currentAnonymousHandle = React.useMemo(
    () => getAnonymousHandle(session?.user),
    [session]
  );
  const isAuthenticated = isLoggedIn(session);
  const canPostAnonymously = hasAnonymousHandle(session?.user);
  const isPlaceRoute = appRoute.view === 'place';

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
      setVotes([]);
      setAllComments([]);
      setCommentVotes([]);
      setErrorMessage('Supabase environment variables are missing for the web app.');
      return {
        places: [],
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
      setVotes(nextData.votes);
      setAllComments(nextData.comments);
      setCommentVotes(nextData.commentVotes);
      setErrorMessage('');

      return nextData;
    } catch (error) {
      setPlaces([]);
      setVotes([]);
      setAllComments([]);
      setCommentVotes([]);
      setErrorMessage(error?.message ?? 'Topey could not reach Supabase right now.');
      return {
        places: [],
        votes: [],
        comments: [],
        commentVotes: [],
      };
    }
  }, []);

  const applySession = React.useCallback(
    async (nextSession, { keepAuthModalOpen = false } = {}) => {
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

      await refreshData(resolvedSession);
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
          keepAuthModalOpen: !hasAnonymousHandle(safeSession?.user),
        });
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
  const visiblePlaces = React.useMemo(
    () =>
      getMapPlacesForRegion(places, mapRegion, effectiveVotes, selectedPlaceId).map((place) => ({
        ...place,
        voteBreakdown: getVoteBreakdown(effectiveVotes, place.id),
      })),
    [effectiveVotes, mapRegion, places, selectedPlaceId]
  );
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
    },
    [navigateToRoute, places, trackPlaceOpen]
  );

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
      setCommentDraft(nextReplyTarget ? `@${nextReplyTarget.authorName || 'Topey user'} ` : '');
      setIsComposerModalVisible(true);
    },
    [isAuthenticated, openAuthModal]
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

  const handleRequestEmailAccess = React.useCallback(async ({ email, username }) => {
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

    if (normalizedUsername && normalizedUsername.length < 3) {
      setErrorMessage('Choose an anonymous name with at least 3 characters.');
      return;
    }

    try {
      setIsAuthBusy(true);
      setErrorMessage('');
      setAuthNoticeMessage('');
      writePendingAnonymousHandle(normalizedUsername);
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: getWebAuthRedirectUrl(),
          data: normalizedUsername ? { preferred_username: normalizedUsername } : undefined,
        },
      });

      if (error) {
        throw error;
      }

      setAuthNoticeMessage(
        normalizedUsername
          ? 'Check your email for the sign-in link. We will finish claiming that anonymous name when you open it.'
          : 'Check your email for the sign-in link. If this is your first time, you will choose an anonymous name after opening it.'
      );
    } catch (error) {
      setErrorMessage(error?.message ?? 'Email sign-in failed.');
    } finally {
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
  }, []);

  const handleCreatePlace = React.useCallback(async () => {
    if (!newPlaceName.trim() || !newPlaceDescription.trim()) {
      setErrorMessage('Add a name and description before saving the place.');
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
        setFocusedPlaceId(newestPlace.id);
        setSelectedPlaceId(newestPlace.id);
        openPlacePage(newestPlace.id, {
          place: newestPlace,
          replaceHistory: false,
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
    openPlacePage,
    refreshData,
    session,
  ]);

  const topControls = isAddMode ? (
    <div className="hud-row">
      <AppButton label="Back" variant="secondary" size="compact" onClick={cancelAddPlace} />
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
  const hasActiveModal = isAuthModalVisible || isComposerModalVisible || isAddSheetVisible;

  if (!isHydrated) {
    return (
      <div className="loading-screen">
        <div className="loading-title">Topey</div>
        <p className="loading-copy">Share Spaces</p>
      </div>
    );
  }

  return (
    <div
      className={`app-shell${hasActiveModal ? ' has-modal' : ''}`}
      style={{
        '--color-background': WEB_SHELL_COLORS.background,
        '--color-card': WEB_SHELL_COLORS.card,
        '--color-elevated': WEB_SHELL_COLORS.elevatedCard,
        '--color-border': WEB_SHELL_COLORS.border,
        '--color-separator': WEB_SHELL_COLORS.separator,
        '--color-text': WEB_SHELL_COLORS.text,
        '--color-muted': WEB_SHELL_COLORS.mutedText,
        '--color-primary': WEB_SHELL_COLORS.primary,
        '--color-primary-text': WEB_SHELL_COLORS.primaryText,
        '--color-accent': WEB_SHELL_COLORS.accent,
        '--color-backdrop': WEB_SHELL_COLORS.sheetBackdrop,
        '--color-handle': WEB_SHELL_COLORS.handle,
      }}
    >
      <div className="sr-only" id={helpId}>
        Drag or two-finger scroll to pan. Pinch or scroll to zoom. Arrow keys and plus or minus
        keys work when the map is focused, and Page Up / Page Down move between visible places.
      </div>

      {isPlaceRoute ? (
        <div aria-hidden={hasActiveModal}>
          <PlacePage
            accountLabel={isAuthenticated ? 'Profile' : 'Sign in'}
            commentThreads={commentThreads}
            comments={comments}
            commentVoteState={commentVoteState}
            currentVote={currentVote}
            onAccount={openAuthModal}
            onBackToMap={() => navigateToRoute({ placeId: '', view: 'map' })}
            onCommentVote={handleCommentVote}
            onCompose={openComposer}
            onOpenLocation={handleOpenLocation}
            onVote={handleVote}
            place={selectedPlace}
            voteBreakdown={voteBreakdown}
          />
        </div>
      ) : (
        <main
          aria-hidden={hasActiveModal}
          className={`map-screen${isAddMode ? ' is-add-mode' : ''}`}
        >
          <DesktopMap
            addMode={isAddMode}
            addPinCoordinates={addPinCoordinates}
            focusedPlace={focusedPlace}
            onAddPinChange={setAddPinCoordinates}
            onOpenSelected={handleOpenSelected}
            onRegionChange={setMapRegion}
            onSelectPlace={selectPlace}
            selectedPlaceId={selectedPlaceId}
            userRegion={userRegion}
            visiblePlaces={visiblePlaces}
          />

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
          )}

          {errorMessage && !isAuthModalVisible ? <div className="status-banner">{errorMessage}</div> : null}
        </main>
      )}

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
              {currentUser.email ? <div className="profile-meta">{currentUser.email}</div> : null}
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
            <AuthCard
              authBusy={isAuthBusy}
              errorMessage={errorMessage}
              helperText={authNoticeMessage}
              onRequestEmailAccess={handleRequestEmailAccess}
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
  accountLabel,
  commentThreads,
  comments,
  commentVoteState,
  currentVote,
  onAccount,
  onBackToMap,
  onCommentVote,
  onCompose,
  onOpenLocation,
  onVote,
  place,
  voteBreakdown,
}) {
  const commentCount = place?.threadCount ?? comments.length;

  if (!place) {
    return (
      <main className="place-page">
        <div className="place-page-shell">
          <div className="place-page-nav">
            <button className="page-nav-button" type="button" onClick={onBackToMap}>
              Back to map
            </button>
            <button className="page-nav-button" type="button" onClick={onAccount}>
              {accountLabel}
            </button>
          </div>

          <section className="place-page-card place-page-empty-card">
            <p className="place-page-kicker">Topey</p>
            <h1 className="place-page-title">Place not found</h1>
            <p className="place-page-copy">
              This place link does not match anything in the current dataset.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="place-page">
      <div className="place-page-shell">
        <div className="place-page-nav">
          <button className="page-nav-button" type="button" onClick={onBackToMap}>
            Back to map
          </button>
          <button className="page-nav-button" type="button" onClick={onAccount}>
            {accountLabel}
          </button>
        </div>

        <div className="place-page-stack">
          <article className="place-page-post">
            <div className="place-page-content place-page-post-content">
              <div className="place-page-meta-row">
                <span className="place-page-kicker">Topey</span>
                <span className="place-page-meta-dot">•</span>
                <span className="place-page-meta-inline">
                  Posted by {formatUserHandle(place.authorName)}
                </span>
                <span className="place-page-meta-dot">•</span>
                <span className="place-page-meta-inline">{formatRelativeTime(place.createdAt)}</span>
              </div>
              <h1 className="place-page-title">{place.name}</h1>

              <div className="place-page-summary-line">
                <span>{formatSignedValue(voteBreakdown.score)} points</span>
                <span>{commentCount} comments</span>
                <span>{voteBreakdown.ratioLabel} split</span>
              </div>

              <p className="place-page-copy">{place.description}</p>

              <VoteControls
                className="place-page-vote-bar"
                currentVote={currentVote}
                direction="horizontal"
                onDownvote={() => onVote(-1)}
                onUpvote={() => onVote(1)}
                score={voteBreakdown.score}
              />

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
              </div>
            </div>
          </article>

          <section className="place-page-comments">
            <div className="thread-header place-page-thread-header">
              <div>
                <div className="thread-kicker">Topey</div>
                <h2 className="thread-title place-page-thread-title">Comments</h2>
              </div>
              <div className="place-page-comment-count">
                {comments.length ? `${comments.length} comments` : 'Start the thread'}
              </div>
            </div>

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
    </main>
  );
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

function AuthCard({
  authBusy,
  errorMessage,
  helperText,
  onRequestEmailAccess,
}) {
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');

  return (
    <div className="auth-card">
      <p className="sheet-kicker">Topey</p>
      <h2 className="sheet-title">Email access</h2>
      <p className="sheet-copy">
        We only collect your email. Add an anonymous name now, or choose it after you open the
        sign-in link.
      </p>

      <input
        className="sheet-input"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        className="sheet-input"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="Anonymous name (optional for returning users)"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />
      <AppButton
        label={authBusy ? 'Sending link...' : 'Email me a sign-in link'}
        size="default"
        styleClassName="auth-submit-button"
        onClick={() => onRequestEmailAccess({ email, username })}
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
  const normalized = `${name || 'Topey user'}`
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
