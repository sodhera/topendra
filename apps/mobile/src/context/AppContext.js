import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import {
  getAnonymousHandle,
  getUserIdentity,
  hasAnonymousHandle,
  normalizeAnonymousUsername,
} from '@topey/shared/lib/auth';
import {
  PENDING_ANONYMOUS_HANDLE_KEY,
  VIEWER_SESSION_KEY,
} from '@topey/shared/lib/constants';
import {
  claimAnonymousHandle,
  createComment,
  createPlace,
  createPlaceOpenEvent,
  fetchAppData,
  voteForComment,
  voteForPlace,
} from '../lib/backend';
import { getAuthRedirectUrl, getSafeSession, restoreSessionFromUrl, supabase } from '../lib/supabase';

const AppContext = createContext(null);

function getReadableError(error, fallback) {
  return error?.message ?? fallback;
}

function createViewerSessionId() {
  return `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getOrCreateViewerSessionId() {
  const existingId = await AsyncStorage.getItem(VIEWER_SESSION_KEY);

  if (existingId) {
    return existingId;
  }

  const nextId = createViewerSessionId();
  await AsyncStorage.setItem(VIEWER_SESSION_KEY, nextId);
  return nextId;
}

async function readPendingAnonymousHandle() {
  return normalizeAnonymousUsername(
    (await AsyncStorage.getItem(PENDING_ANONYMOUS_HANDLE_KEY)) ?? ''
  );
}

async function writePendingAnonymousHandle(handle) {
  const normalizedHandle = normalizeAnonymousUsername(handle);

  if (normalizedHandle) {
    await AsyncStorage.setItem(PENDING_ANONYMOUS_HANDLE_KEY, normalizedHandle);
    return;
  }

  await AsyncStorage.removeItem(PENDING_ANONYMOUS_HANDLE_KEY);
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [viewerSessionId, setViewerSessionId] = useState('');
  const [places, setPlaces] = useState([]);
  const [votes, setVotes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentVotes, setCommentVotes] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEmailAuthLoading, setIsEmailAuthLoading] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [authNoticeMessage, setAuthNoticeMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const refreshData = useCallback(async (activeSession) => {
    setIsRefreshing(true);

    try {
      const data = await fetchAppData({
        includeComments: Boolean(activeSession?.user),
      });

      setPlaces(data.places);
      setVotes(data.votes);
      setComments(data.comments);
      setCommentVotes(data.commentVotes);
      setErrorMessage('');
      return data;
    } catch (error) {
      setPlaces([]);
      setVotes([]);
      setComments([]);
      setCommentVotes([]);
      setErrorMessage(getReadableError(error, 'Topey could not reach Supabase right now.'));
      return {
        places: [],
        votes: [],
        comments: [],
        commentVotes: [],
      };
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const maybeClaimPendingHandle = useCallback(async (activeSession) => {
    if (!activeSession?.user) {
      return activeSession ?? null;
    }

    const pendingHandle = await readPendingAnonymousHandle();
    const existingHandle = getAnonymousHandle(activeSession.user);
    const handleToClaim = pendingHandle || existingHandle;

    if (!handleToClaim) {
      return activeSession;
    }

    const claimedHandle = await claimAnonymousHandle({
      user: activeSession.user,
      handle: handleToClaim,
    });
    await writePendingAnonymousHandle('');

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

  const applySession = useCallback(
    async (nextSession, { keepAuthModalOpen = false } = {}) => {
      let resolvedSession = nextSession ?? null;

      if (resolvedSession?.user) {
        try {
          resolvedSession = await maybeClaimPendingHandle(resolvedSession);
          setErrorMessage('');
        } catch (error) {
          setErrorMessage(getReadableError(error, 'Anonymous name setup failed.'));
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

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const nextViewerSessionId = await getOrCreateViewerSessionId();
        const initialUrl = await Linking.getInitialURL();
        const restoredSession = initialUrl ? await restoreSessionFromUrl(initialUrl) : null;
        const { session: safeSession } = restoredSession
          ? { session: restoredSession }
          : await getSafeSession();

        if (!active) {
          return;
        }

        setViewerSessionId(nextViewerSessionId);
        await applySession(safeSession ?? null, {
          keepAuthModalOpen: !hasAnonymousHandle(safeSession?.user),
        });
      } catch (error) {
        if (active) {
          setErrorMessage(getReadableError(error, 'Topey could not restore the saved session.'));
        }
      } finally {
        if (active) {
          setIsHydrated(true);
        }
      }
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      applySession(nextSession ?? null).catch(() => undefined);
    });

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (!active) {
        return;
      }

      restoreSessionFromUrl(url)
        .then((nextSession) => {
          if (!nextSession || !active) {
            return;
          }

          applySession(nextSession).catch(() => undefined);
        })
        .catch((error) => {
          if (active) {
            setErrorMessage(getReadableError(error, 'Email sign-in link could not be completed.'));
          }
        });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [applySession]);

  const requestEmailAccess = useCallback(async ({ email, username }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = normalizeAnonymousUsername(username);

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Enter a valid email address.');
    }

    if (normalizedUsername && normalizedUsername.length < 3) {
      throw new Error('Choose an anonymous name with at least 3 characters.');
    }

    setIsEmailAuthLoading(true);
    setErrorMessage('');
    setAuthNoticeMessage('');

    try {
      await writePendingAnonymousHandle(normalizedUsername);
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: getAuthRedirectUrl(),
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
      setErrorMessage(getReadableError(error, 'Email sign-in failed.'));
      throw error;
    } finally {
      setIsEmailAuthLoading(false);
    }
  }, []);

  const claimHandle = useCallback(async ({ handle }) => {
    if (!session?.user) {
      throw new Error('Login required before choosing an anonymous name.');
    }

    const normalizedHandle = normalizeAnonymousUsername(handle);

    if (normalizedHandle.length < 3) {
      throw new Error('Choose an anonymous name with at least 3 characters.');
    }

    setIsEmailAuthLoading(true);
    setErrorMessage('');
    setAuthNoticeMessage('');

    try {
      await writePendingAnonymousHandle(normalizedHandle);
      const claimedHandle = await claimAnonymousHandle({
        user: session.user,
        handle: normalizedHandle,
      });
      await writePendingAnonymousHandle('');
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
      await refreshData(session);
    } catch (error) {
      setErrorMessage(getReadableError(error, 'Anonymous name setup failed.'));
      setAuthNoticeMessage('Pick a different anonymous name to continue.');
      throw error;
    } finally {
      setIsEmailAuthLoading(false);
    }
  }, [refreshData, session]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(getReadableError(error, 'Sign-out failed.'));
      throw error;
    }

    await writePendingAnonymousHandle('');
    setAuthNoticeMessage('');
    setIsAuthModalVisible(false);
  }, []);

  const addPlace = useCallback(
    async ({ name, description, latitude, longitude }) => {
      if (!session?.user) {
        throw new Error('Login required before adding a place.');
      }

      if (!hasAnonymousHandle(session.user)) {
        throw new Error('Choose an anonymous name before posting or adding places.');
      }

      await createPlace({
        user: session.user,
        name,
        description,
        latitude,
        longitude,
      });

      await refreshData(session);
    },
    [refreshData, session]
  );

  const votePlace = useCallback(
    async ({ placeId, value }) => {
      if (!session?.user) {
        throw new Error('Login required before voting.');
      }

      await voteForPlace({
        placeId,
        userId: session.user.id,
        value,
      });

      await refreshData(session);
    },
    [refreshData, session]
  );

  const addComment = useCallback(
    async ({ placeId, body, parentCommentId = null }) => {
      if (!session?.user) {
        throw new Error('Login required before commenting.');
      }

      if (!hasAnonymousHandle(session.user)) {
        throw new Error('Choose an anonymous name before posting or adding places.');
      }

      await createComment({
        placeId,
        parentCommentId,
        user: session.user,
        body,
      });

      await refreshData(session);
    },
    [refreshData, session]
  );

  const voteComment = useCallback(
    async ({ commentId, value }) => {
      if (!session?.user) {
        throw new Error('Login required before voting.');
      }

      await voteForComment({
        commentId,
        userId: session.user.id,
        value,
      });

      await refreshData(session);
    },
    [refreshData, session]
  );

  const trackPlaceOpen = useCallback(
    async ({ placeId, sourceScreen }) => {
      if (!viewerSessionId || !placeId) {
        return;
      }

      try {
        await createPlaceOpenEvent({
          placeId,
          userId: session?.user?.id ?? null,
          viewerSessionId,
          sourceScreen,
        });
      } catch {
        return;
      }
    },
    [session?.user?.id, viewerSessionId]
  );

  const currentUser = session?.user ? getUserIdentity(session.user) : getUserIdentity(null);

  const value = useMemo(
    () => ({
      state: {
        session,
        currentUser,
        places,
        votes,
        comments,
        commentVotes,
      },
      isHydrated,
      isRefreshing,
      isEmailAuthLoading,
      isAuthModalVisible,
      setIsAuthModalVisible,
      authNoticeMessage,
      errorMessage,
      refreshData,
      requestEmailAccess,
      claimHandle,
      signOut,
      addPlace,
      votePlace,
      addComment,
      voteComment,
      trackPlaceOpen,
    }),
    [
      session,
      currentUser,
      places,
      votes,
      comments,
      commentVotes,
      isHydrated,
      isRefreshing,
      isEmailAuthLoading,
      isAuthModalVisible,
      authNoticeMessage,
      errorMessage,
      refreshData,
      requestEmailAccess,
      claimHandle,
      signOut,
      addPlace,
      votePlace,
      addComment,
      voteComment,
      trackPlaceOpen,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);

  if (!value) {
    throw new Error('useAppContext must be used inside AppProvider.');
  }

  return value;
}
