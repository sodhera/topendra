import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { buildKathmanduDemoData } from '@topey/shared/data/demoCatalog';
import { getUserIdentity, normalizeAnonymousUsername } from '@topey/shared/lib/auth';
import { createComment, createPlace, createPlaceOpenEvent, fetchAppData, voteForPlace } from '../lib/backend';
import { VIEWER_SESSION_KEY } from '@topey/shared/lib/constants';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

const AppContext = createContext(null);
const demoData = buildKathmanduDemoData();

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

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [viewerSessionId, setViewerSessionId] = useState('');
  const [places, setPlaces] = useState([]);
  const [votes, setVotes] = useState([]);
  const [comments, setComments] = useState([]);
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
      setErrorMessage('');
    } catch (error) {
      setPlaces(demoData.places);
      setVotes(demoData.votes);
      setComments(demoData.comments);
      setErrorMessage(getReadableError(error, 'Topey could not reach Supabase right now.'));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const applySession = useCallback(
    async (nextSession) => {
      setSession(nextSession ?? null);
      if (nextSession?.user) {
        setAuthNoticeMessage('');
      }
      await refreshData(nextSession ?? null);
    },
    [refreshData]
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
        await applySession(safeSession ?? null);
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

    if (normalizedUsername.length < 3) {
      throw new Error('Choose an anonymous username with at least 3 characters.');
    }

    setIsEmailAuthLoading(true);
    setErrorMessage('');
    setAuthNoticeMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: getAuthRedirectUrl(),
          data: {
            preferred_username: normalizedUsername,
          },
        },
      });

      if (error) {
        throw error;
      }

      setAuthNoticeMessage(
        'Check your email for the sign-in link. Your places and comments will show the anonymous username you chose.'
      );
    } catch (error) {
      setErrorMessage(getReadableError(error, 'Email sign-in failed.'));
      throw error;
    } finally {
      setIsEmailAuthLoading(false);
    }
  }, []);

  const signUpWithPassword = useCallback(async ({ email, username, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = normalizeAnonymousUsername(username);

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Enter a valid email address.');
    }

    if (normalizedUsername.length < 3) {
      throw new Error('Choose an anonymous username with at least 3 characters.');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    setIsEmailAuthLoading(true);
    setErrorMessage('');
    setAuthNoticeMessage('');

    try {
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
    } catch (error) {
      setErrorMessage(getReadableError(error, 'Sign-up failed.'));
      throw error;
    } finally {
      setIsEmailAuthLoading(false);
    }
  }, []);

  const signInWithPassword = useCallback(async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Enter a valid email address.');
    }

    if (!password) {
      throw new Error('Enter your password.');
    }

    setIsEmailAuthLoading(true);
    setErrorMessage('');
    setAuthNoticeMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setErrorMessage(getReadableError(error, 'Sign-in failed.'));
      throw error;
    } finally {
      setIsEmailAuthLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsEmailAuthLoading(true);
    setErrorMessage('');
    setAuthNoticeMessage('');

    try {
      const redirectUrl = getAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'success' && result.url) {
          const params = Linking.parse(result.url);
          if (params.queryParams?.error) {
            throw new Error(params.queryParams.error_description || 'OAuth Error');
          }
          await restoreSessionFromUrl(result.url);
        } else if (result.type === 'cancel') {
          // Do nothing on cancel
        } else {
          throw new Error('Google Sign-In was not completed.');
        }
      }
    } catch (error) {
      setErrorMessage(getReadableError(error, 'Google Sign-In failed.'));
    } finally {
      setIsEmailAuthLoading(false);
    }
  }, []);


  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(getReadableError(error, 'Sign-out failed.'));
      throw error;
    }
    setAuthNoticeMessage('');
  }, []);

  const addPlace = useCallback(
    async ({ name, description, latitude, longitude }) => {
      if (!session?.user) {
        throw new Error('Login required before adding a place.');
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
    async ({ placeId, body }) => {
      if (!session?.user) {
        throw new Error('Login required before commenting.');
      }

      await createComment({
        placeId,
        user: session.user,
        body,
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
      } catch (error) {
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
      signUpWithPassword,
      signInWithPassword,
      signInWithGoogle,
      signOut,
      addPlace,
      votePlace,
      addComment,
      trackPlaceOpen,
    }),
    [
      session,
      currentUser,
      places,
      votes,
      comments,
      isHydrated,
      isRefreshing,
      isEmailAuthLoading,
      isAuthModalVisible,
      authNoticeMessage,
      errorMessage,
      refreshData,
      requestEmailAccess,
      signUpWithPassword,
      signInWithPassword,
      signInWithGoogle,
      signOut,
      addPlace,
      votePlace,
      addComment,
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
