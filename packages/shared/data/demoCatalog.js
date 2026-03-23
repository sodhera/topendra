import { USER_IDS } from '../lib/constants';

export const DEMO_PLACE_COUNT = 50;
export const DEMO_AUTHOR_NAME = 'Topey demo';

const KATHMANDU_CENTER = {
  latitude: 27.7172,
  longitude: 85.324,
};

const NEIGHBORHOODS = [
  'Thamel',
  'Lazimpat',
  'Baluwatar',
  'Baneshwor',
  'Kupondole',
  'Boudha',
  'Pulchowk',
  'Naxal',
  'Kalimati',
  'Swayambhu',
];

const PLACE_TYPES = [
  'Courtyard',
  'Cafe Corner',
  'Roof Deck',
  'Patio',
  'Tea Stop',
  'Lookout',
  'Garden Bench',
  'Alley Seat',
  'Window Bar',
  'Arcade',
];

const DESCRIPTORS = [
  'Easy to drop into between meetings without losing momentum.',
  'Busy enough to feel alive, calm enough to keep a thread going.',
  'Good stop when you want a quick place check-in without a long sit-down.',
  'Reliable pick when the main road feels too loud but you still want foot traffic nearby.',
  'Works well for short hangs, quick updates, and late-night regrouping.',
  'Quietest once the first dinner rush clears and the scooters thin out.',
  'A dependable fallback spot when the obvious places get packed.',
  'Usually has just enough room to pause, message people, and keep moving.',
];

const COMMENTERS = ['Aarav', 'Sita', 'Milan', 'Riya', 'Kabir', 'Nima', 'Anisha', 'Pratik'];

const COMMENT_OPENERS = [
  'Best part is',
  'Works well when',
  'Heads up:',
  'Worth knowing:',
  'Good sign is',
  'The move here is',
];

const COMMENT_DETAILS = [
  'the back side stays quieter than the street edge.',
  'you need a quick place to regroup without committing to a full meal.',
  'the first row fills up fast, so use the side seating instead.',
  'service is faster before the late dinner crowd arrives.',
  'the breeze picks up after sunset and the space opens up.',
  'it stays practical for short chats and comment check-ins.',
  'Wi-Fi is stable enough for uploads and quick replies.',
  'lighting is better near the inner wall than the outer edge.',
];

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function formatDeterministicUuid(value) {
  return `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
}

function formatPlaceId(index) {
  return formatDeterministicUuid(1000 + index + 1);
}

function formatVoteId(index, variant, voteIndex) {
  return formatDeterministicUuid(
    (variant === 'up' ? 200000 : 250000) + (index + 1) * 10 + voteIndex + 1
  );
}

function formatCommentId(index, commentIndex) {
  return formatDeterministicUuid(300000 + (index + 1) * 10 + commentIndex + 1);
}

export function buildKathmanduDemoData(count = DEMO_PLACE_COUNT) {
  const places = [];
  const votes = [];
  const comments = [];

  for (let index = 0; index < count; index += 1) {
    const seedIndex = index + 1;
    const placeId = formatPlaceId(index);
    const neighborhood = NEIGHBORHOODS[index % NEIGHBORHOODS.length];
    const placeType = PLACE_TYPES[index % PLACE_TYPES.length];
    const descriptor = DESCRIPTORS[index % DESCRIPTORS.length];
    const latitude = Number(
      (
        KATHMANDU_CENTER.latitude +
        Math.sin(seedIndex * 1.37) * 0.031 +
        Math.cos(seedIndex * 0.71) * 0.009
      ).toFixed(6)
    );
    const longitude = Number(
      (
        KATHMANDU_CENTER.longitude +
        Math.cos(seedIndex * 1.13) * 0.037 +
        Math.sin(seedIndex * 0.53) * 0.011
      ).toFixed(6)
    );
    const createdAt = minutesAgo(90 + seedIndex * 11);
    const positiveVotes = 3 + ((seedIndex * 7) % 5);
    const negativeVotes = (seedIndex * 3) % 3;
    const threadCount = 3 + (seedIndex % 2);

    places.push({
      id: placeId,
      name: `${neighborhood} ${placeType}`,
      description: descriptor,
      latitude,
      longitude,
      createdBy: USER_IDS.DEMO,
      authorName: DEMO_AUTHOR_NAME,
      createdAt,
      threadCount,
    });

    for (let voteIndex = 0; voteIndex < positiveVotes; voteIndex += 1) {
      votes.push({
        id: formatVoteId(index, 'up', voteIndex),
        placeId,
        userId: null,
        value: 1,
        createdAt: minutesAgo(45 + seedIndex * 9 + voteIndex + 1),
      });
    }

    for (let voteIndex = 0; voteIndex < negativeVotes; voteIndex += 1) {
      votes.push({
        id: formatVoteId(index, 'down', voteIndex),
        placeId,
        userId: null,
        value: -1,
        createdAt: minutesAgo(35 + seedIndex * 7 + voteIndex + 1),
      });
    }

    for (let commentIndex = 0; commentIndex < threadCount; commentIndex += 1) {
      const opener = COMMENT_OPENERS[(seedIndex + commentIndex - 1) % COMMENT_OPENERS.length];
      const detail = COMMENT_DETAILS[
        ((seedIndex * 2 + commentIndex - 1) % COMMENT_DETAILS.length + COMMENT_DETAILS.length) %
          COMMENT_DETAILS.length
      ];
      const authorName = COMMENTERS[
        ((seedIndex + commentIndex - 1) % COMMENTERS.length + COMMENTERS.length) %
          COMMENTERS.length
      ];
      const parentCommentId =
        commentIndex % 2 === 1 ? formatCommentId(index, commentIndex - 1) : null;

      comments.push({
        id: formatCommentId(index, commentIndex),
        placeId,
        parentCommentId,
        authorId: null,
        authorName,
        body: `${opener} ${detail}`,
        createdAt: minutesAgo(20 + seedIndex * 8 + (commentIndex + 1) * 3),
      });
    }
  }

  return {
    places,
    votes,
    comments,
  };
}
