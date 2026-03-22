import { USER_IDS } from '../src/lib/constants';
import { getUserLabel, isLoggedIn } from '../src/lib/auth';

describe('auth helpers', () => {
  test('guest is treated as logged out', () => {
    expect(isLoggedIn(USER_IDS.GUEST)).toBe(false);
    expect(getUserLabel(USER_IDS.GUEST)).toBe('Guest');
  });

  test('demo user is treated as logged in', () => {
    expect(isLoggedIn(USER_IDS.DEMO)).toBe(true);
    expect(getUserLabel(USER_IDS.DEMO)).toBe('Logged in');
  });
});
