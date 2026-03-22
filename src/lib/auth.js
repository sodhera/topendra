import { USER_IDS } from './constants';

export function isLoggedIn(userId) {
  return userId !== USER_IDS.GUEST;
}

export function getUserLabel(userId) {
  return isLoggedIn(userId) ? 'Logged in' : 'Guest';
}
