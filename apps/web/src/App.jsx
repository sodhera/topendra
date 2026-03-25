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
  getCommentThreadsForPlace,
  getCommentsForPlace,
  getMapPlacesForRegion,
  getVoteBreakdown,
} from '@topey/shared/lib/geo';
import {
  createComment,
  createPlace,
  createPlaceOpenEvent,
  fetchAppData,
  voteForPlace,
} from './lib/backend';
import { getSafeSession, hasSupabaseConfig, supabase } from './lib/supabase';
import DesktopMap from './components/DesktopMap';

const demoData = buildKathmanduDemoData();
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
  const [focusedPlaceId, setFocusedPlaceId] = React.useState('');
  const [mapRegion, setMapRegion] = React.useState(KATHMANDU_EXPLORE_REGION);
  const [userRegion, setUserRegion] = React.useState(null);
  const [isAuthModalVisible, setIsAuthModalVisible] = React.useState(false);
  const [isComposerModalVisible, setIsComposerModalVisible] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [replyTarget, setReplyTarget] = React.useState(null);
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);
  const [commentVotes, setCommentVotes] = React.useState({});
  const [isAddMode, setIsAddMode] = React.useState(false);
  const [isAddSheetVisible, setIsAddSheetVisible] = React.useState(false);
  const [newPlaceName, setNewPlaceName] = React.useState('');
  const [newPlaceDescription, setNewPlaceDescription] = React.useState('');
  const [addPinCoordinates, setAddPinCoordinates] = React.useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [isSavingPlace, setIsSavingPlace] = React.useState(false);

  const currentUser = React.useMemo(() => getUserIdentity(session?.user), [session]);
  const isAuthenticated = isLoggedIn(session);
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
  const visiblePlaces = React.useMemo(
    () =>
      getMapPlacesForRegion(places, mapRegion, votes, selectedPlaceId).map((place) => ({
        ...place,
        voteBreakdown: getVoteBreakdown(votes, place.id),
      })),
    [mapRegion, places, selectedPlaceId, votes]
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

      setAuthNoticeMessage(
        'Account created. If email confirmation is enabled, finish it from your inbox.'
      );
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
      const redirectTo = getWebAuthRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
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
    navigateToRoute({ placeId: '', view: 'map' });
    setIsAddMode(true);
    setIsComposerModalVisible(false);
    setSelectedPlaceId('');
    setFocusedPlaceId('');
    setCommentDraft('');
    setReplyTarget(null);
  }, [navigateToRoute]);
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
    <div className="hud-row hud-row-split">
      <AppButton label="Back" variant="secondary" size="compact" onClick={cancelAddPlace} />
      <AppButton label="Add here" size="compact" onClick={() => setIsAddSheetVisible(true)} />
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
            commentVotes={commentVotes}
            comments={comments}
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
            focusedPlace={focusedPlace}
            onAddPinChange={setAddPinCoordinates}
            onOpenSelected={handleOpenSelected}
            onRegionChange={setMapRegion}
            onSelectPlace={selectPlace}
            selectedPlaceId={selectedPlaceId}
            userRegion={userRegion}
            visiblePlaces={visiblePlaces}
          />

          {isAddMode ? (
            <div
              className="center-pin"
              aria-hidden="true"
              style={{ top: '40%' }}
            >
              <svg
                className="center-pin-icon"
                fill="none"
                viewBox="0 0 52 68"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M26 64C26 64 46 42.1234 46 24.9412C46 13.9274 37.0457 5 26 5C14.9543 5 6 13.9274 6 24.9412C6 42.1234 26 64 26 64Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
                <circle cx="26" cy="25" r="8.5" stroke="currentColor" strokeWidth="3" />
              </svg>
            </div>
          ) : null}

          <div className="map-hud map-hud-top">{topControls}</div>

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

          {errorMessage && !isAuthModalVisible ? <div className="status-banner">{errorMessage}</div> : null}
        </main>
      )}

      {isAuthModalVisible ? (
        <SheetModal
          dialogClassName={isAuthenticated ? '' : 'sheet-auth'}
          onClose={() => setIsAuthModalVisible(false)}
        >
          {isAuthenticated ? (
            <div className="sheet-header">
              <div className="sheet-handle" />
              <p className="sheet-kicker">Account</p>
              <h2 className="sheet-title">Profile</h2>
              <div className="profile-name">{currentUser.name}</div>
              {currentUser.email ? <div className="profile-meta">{currentUser.email}</div> : null}
              <AppButton
                label="Sign out"
                size="default"
                onClick={handleSignOut}
                styleClassName="auth-signout-button"
              />
            </div>
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
  commentVotes,
  comments,
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
            <p className="place-page-kicker">r/topeyplaces</p>
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
          <article className="place-page-card place-page-post-card">
            <div className="place-page-layout">
              <aside className="place-page-vote-column">
                <VoteControls
                  currentVote={currentVote}
                  onDownvote={() => onVote(-1)}
                  onUpvote={() => onVote(1)}
                  score={voteBreakdown.score}
                />
              </aside>

              <div className="place-page-content">
                <p className="place-page-kicker">r/topeyplaces</p>
                <h1 className="place-page-title">{place.name}</h1>

                <div className="sheet-meta-row place-page-meta-row">
                  <span className="sheet-meta-pill">Map drop</span>
                  <span className="sheet-meta-inline">Posted by {formatUserHandle(place.authorName)}</span>
                  <span className="sheet-meta-inline">{formatRelativeTime(place.createdAt)}</span>
                </div>

                <div className="place-page-summary-line">
                  <span>{formatSignedValue(voteBreakdown.score)} votes</span>
                  <span>{voteBreakdown.ratioLabel} ratio</span>
                  <span>{commentCount} comments</span>
                </div>

                <p className="place-page-copy">{place.description}</p>

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
            </div>
          </article>

          <section className="place-page-card place-page-comments-card">
            <div className="thread-header place-page-thread-header">
              <div>
                <div className="thread-kicker">Top comments</div>
                <h2 className="thread-title place-page-thread-title">Community discussion</h2>
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
                    commentVotes={commentVotes}
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

function VoteControls({ currentVote, onDownvote, onUpvote, score }) {
  return (
    <div className="vote-controls">
      <button className="vote-arrow" type="button" onClick={onUpvote} aria-label="Upvote place">
        <span className={currentVote === 1 ? 'is-active' : ''}>▲</span>
      </button>
      <span className="vote-score">{formatSignedValue(score)}</span>
      <button className="vote-arrow" type="button" onClick={onDownvote} aria-label="Downvote place">
        <span className={currentVote === -1 ? 'is-active' : ''}>▼</span>
      </button>
    </div>
  );
}

function CommentThread({
  commentThread,
  commentVotes,
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
        depth={nextDepth}
        onDownvote={() => onCommentVote(commentThread.id, -1)}
        onReply={() => onCompose(commentThread)}
        onUpvote={() => onCommentVote(commentThread.id, 1)}
        score={commentVotes[commentThread.id] ?? 0}
      />

      {nestedReplies.length ? (
        <div className="comment-replies">
          {nestedReplies.map((reply) => (
            <CommentThread
              key={reply.id}
              commentThread={reply}
              commentVotes={commentVotes}
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
  depth = 0,
  onDownvote,
  onReply,
  onUpvote,
  score,
}) {
  return (
    <article className={`comment-card depth-${Math.min(depth, 3)}`}>
      <div className="comment-vote-rail">
        <CommentArrowButton direction="up" isActive={score === 1} onClick={onUpvote} />
        <span className="comment-score">{formatSignedValue(score)}</span>
        <CommentArrowButton direction="down" isActive={score === -1} onClick={onDownvote} />
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
      <p className="sheet-kicker">r/topeyplaces</p>
      <h2 className="sheet-title">{isSignUp ? 'Create account' : 'Sign in'}</h2>
      <p className="sheet-copy">
        {isSignUp
          ? 'Choose an anonymous handle to vote, reply, and add new places.'
          : 'Sign in to vote, reply, and add new places from the map.'}
      </p>

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
        styleClassName="auth-submit-button"
        onClick={() =>
          isSignUp
            ? onSignUp({ email, username, password })
            : onSignIn({ email, password })
        }
      />
      <button
        className="toggle-auth-button"
        type="button"
        onClick={() => setMode(isSignUp ? 'signin' : 'signup')}
      >
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
