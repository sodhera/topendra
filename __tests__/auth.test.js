import { USER_IDS } from '../src/lib/constants';
import { getUserIdentity, getUserLabel, isLoggedIn, normalizeAnonymousUsername } from '../src/lib/auth';

describe('auth helpers', () => {
  test('guest is treated as logged out', () => {
    expect(isLoggedIn(USER_IDS.GUEST)).toBe(false);
    expect(getUserLabel(USER_IDS.GUEST)).toBe('Guest');
  });

  test('demo user is treated as logged in', () => {
    expect(isLoggedIn(USER_IDS.DEMO)).toBe(true);
    expect(getUserLabel(USER_IDS.DEMO)).toBe('Logged in');
  });

  test('preferred anonymous username wins over real-world identity fields', () => {
    const identity = getUserIdentity({
      id: 'user-1',
      email: 'realname@example.com',
      user_metadata: {
        preferred_username: 'Quiet Courtyard',
        full_name: 'Real Name',
      },
    });

    expect(identity.name).toBe('Quiet Courtyard');
  });

  test('users without a chosen handle stay anonymous by default', () => {
    const identity = getUserIdentity({
      id: 'user-2',
      email: 'realname@example.com',
      user_metadata: {},
    });

    expect(identity.name).toBe('Anonymous member');
  });

  test('anonymous usernames are normalized for storage', () => {
    expect(normalizeAnonymousUsername('  Alley   Fox  ')).toBe('Alley Fox');
  });
});
