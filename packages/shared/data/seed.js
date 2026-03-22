import { USER_IDS } from '../lib/constants';
import { buildKathmanduDemoData } from './demoCatalog';

export function buildSeedState() {
  const demoData = buildKathmanduDemoData();

  return {
    currentUserId: USER_IDS.GUEST,
    users: [
      {
        id: USER_IDS.GUEST,
        name: 'Guest',
      },
      {
        id: USER_IDS.DEMO,
        name: 'Demo user',
      },
    ],
    places: demoData.places,
    comments: demoData.comments,
    votes: demoData.votes,
  };
}
