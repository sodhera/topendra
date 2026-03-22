import { USER_IDS } from '../lib/constants';

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export function buildSeedState() {
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
    places: [
      {
        id: 'place-boudha-rooftop',
        name: 'Boudha Rooftop',
        description: 'Open terrace with a clear skyline and enough distance from the street noise to stay relaxed.',
        latitude: 27.7208,
        longitude: 85.3621,
        createdBy: USER_IDS.DEMO,
        createdAt: minutesAgo(420),
      },
      {
        id: 'place-thamel-courtyard',
        name: 'Thamel Courtyard Stop',
        description: 'A tucked courtyard behind a cafe row that feels calmer after the evening rush.',
        latitude: 27.7165,
        longitude: 85.3117,
        createdBy: USER_IDS.DEMO,
        createdAt: minutesAgo(360),
      },
      {
        id: 'place-jhamsikhel-balcony',
        name: 'Jhamsikhel Balcony',
        description: 'Quiet upper-floor balcony with enough air and enough cover for a short stop.',
        latitude: 27.6797,
        longitude: 85.3169,
        createdBy: USER_IDS.DEMO,
        createdAt: minutesAgo(300),
      },
      {
        id: 'place-baneshwor-patio',
        name: 'Baneshwor Patio',
        description: 'Side patio that stays usable once dinner crowds thin out and scooters stop piling up.',
        latitude: 27.6918,
        longitude: 85.3424,
        createdBy: USER_IDS.DEMO,
        createdAt: minutesAgo(250),
      },
    ],
    comments: [
      {
        id: 'comment-1',
        placeId: 'place-boudha-rooftop',
        authorId: USER_IDS.DEMO,
        body: 'Best after sunset. The far side gets more breeze.',
        createdAt: minutesAgo(120),
      },
      {
        id: 'comment-2',
        placeId: 'place-thamel-courtyard',
        authorId: USER_IDS.DEMO,
        body: 'Gets crowded early. Better later in the evening.',
        createdAt: minutesAgo(90),
      },
    ],
    votes: [
      {
        id: 'vote-1',
        placeId: 'place-boudha-rooftop',
        userId: USER_IDS.DEMO,
        value: 1,
      },
      {
        id: 'vote-2',
        placeId: 'place-thamel-courtyard',
        userId: USER_IDS.DEMO,
        value: 1,
      },
    ],
  };
}
