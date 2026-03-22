import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getUserIdentity } from '../lib/auth';
import { createComment, createPlace, fetchAppData, voteForPlace } from '../lib/backend';
import { completeOAuthFlow, getAuthRedirectUrl, supabase } from '../lib/supabase';

const AppContext = createContext(null);

function getReadableError(error, fallback) {
  return error?.message ?? fallback;
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [places, setPlaces] = useState([]);
  const [votes, setVotes] = useState([]);
  const [comments, setComments] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [authBusyProvider, setAuthBusyProvider] = useState('');
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
      setErrorMessage(getReadableError(error, 'Topey could not reach Supabase right now.'));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!active) {
          return;
        }

        setSession(data.session ?? null);
        await refreshData(data.session ?? null);
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

      setSession(nextSession ?? null);
      refreshData(nextSession ?? null).catch(() => undefined);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refreshData]);

  const signInWithOAuth = useCallback(async (provider) => {
    setAuthBusyProvider(provider);
    setErrorMessage('');

    try {
      const redirectTo = getAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error('Supabase did not return an OAuth URL.');
      }

      const tokens = await completeOAuthFlow(data.url, redirectTo);

      if (!tokens) {
        return;
      }

      const sessionResult = tokens.code
        ? await supabase.auth.exchangeCodeForSession(tokens.code)
        : await supabase.auth.setSession(tokens);

      if (sessionResult.error) {
        throw sessionResult.error;
      }
    } catch (error) {
      setErrorMessage(getReadableError(error, 'Sign-in failed. Check the Supabase OAuth configuration.'));
      throw error;
    } finally {
      setAuthBusyProvider('');
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(getReadableError(error, 'Sign-out failed.'));
      throw error;
    }
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
      authBusyProvider,
      errorMessage,
      refreshData,
      signInWithOAuth,
      signOut,
      addPlace,
      votePlace,
      addComment,
    }),
    [
      session,
      currentUser,
      places,
      votes,
      comments,
      isHydrated,
      isRefreshing,
      authBusyProvider,
      errorMessage,
      refreshData,
      signInWithOAuth,
      signOut,
      addPlace,
      votePlace,
      addComment,
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
