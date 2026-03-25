import { USER_IDS } from './constants';

export function normalizeAnonymousUsername(value) {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
}

export function getAnonymousHandle(user) {
  return normalizeAnonymousUsername(user?.user_metadata?.preferred_username);
}

export function hasAnonymousHandle(user) {
  return getAnonymousHandle(user).length >= 3;
}

export function isLoggedIn(sessionOrUser) {
  if (!sessionOrUser) {
    return false;
  }

  if (typeof sessionOrUser === 'string') {
    return sessionOrUser !== USER_IDS.GUEST;
  }

  return Boolean(sessionOrUser.user ?? sessionOrUser.id);
}

export function getUserIdentity(user) {
  if (typeof user === 'string') {
    if (user === USER_IDS.GUEST) {
      return {
        id: USER_IDS.GUEST,
        name: 'Guest',
        email: '',
        avatarUrl: null,
      };
    }

    return {
      id: user,
      name: 'Logged in',
      email: '',
      avatarUrl: null,
    };
  }

  if (!user) {
    return {
      id: USER_IDS.GUEST,
      name: 'Guest',
      email: '',
      avatarUrl: null,
    };
  }

  const metadata = user.user_metadata ?? {};
  const displayName = getAnonymousHandle(user);

  return {
    id: user.id,
    name: displayName || 'Anonymous member',
    email: user.email ?? '',
    avatarUrl: metadata.avatar_url ?? null,
  };
}

export function getUserLabel(user) {
  return getUserIdentity(user).name;
}
