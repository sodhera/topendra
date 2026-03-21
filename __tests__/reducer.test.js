import { buildSeedState } from '../src/data/seed';
import { MODERATION_STATES, ROLES } from '../src/lib/constants';
import { reducer } from '../src/lib/reducer';

describe('app reducer', () => {
  test('member submissions enter the moderation queue', () => {
    const state = buildSeedState();
    const next = reducer(state, {
      type: 'submit_place',
      payload: {
        authorId: 'maya',
        formValues: {
          title: 'Naya Courtyard',
          neighborhood: 'Baneshwor',
          summary: 'A repeatable courtyard that works after dinner when the side lane clears out.',
          bestTime: 'After 8 PM',
          allowedActions: ['Pre-rolls okay'],
          restrictions: ['Buy first'],
          evidenceType: 'trusted_user_observation',
          evidenceNote: 'Two local users described the same tolerated corner and timing.',
          coords: { x: 40, y: 44 },
          photos: [],
        },
      },
    });

    const added = next.submissions.find((submission) => submission.title === 'Naya Courtyard');
    expect(added).toBeTruthy();
    expect(added.status).toBe(MODERATION_STATES.SUBMITTED);
  });

  test('approval creates a public place', () => {
    const state = buildSeedState();
    const next = reducer(state, {
      type: 'moderate_submission',
      payload: {
        moderatorId: 'anika',
        submissionId: 'submission-1',
        nextState: MODERATION_STATES.APPROVED,
        note: 'Looks defensible.',
      },
    });

    expect(next.places.some((place) => place.id === 'place-submission-1')).toBe(true);
    expect(next.auditLog.some((entry) => entry.changeType === 'submission_approved')).toBe(true);
  });

  test('trusted live edit updates the place and writes an audit entry', () => {
    const state = buildSeedState();
    const next = reducer(state, {
      type: 'live_edit_place',
      payload: {
        actorId: 'sagar',
        placeId: 'place-temple-view',
        formValues: {
          title: 'Temple View Rooftop Cafe',
          neighborhood: 'Boudha',
          summary: 'Airy rooftop cafe with steadier wind cover than before.',
          bestTime: 'Best after 7 PM',
          allowedActions: ['Pre-rolls okay', 'Quiet solo sessions'],
          restrictions: ['No flash photos', 'Keep groups under 4'],
          evidenceType: 'moderator_scout',
          evidenceNote: 'Fresh weekday scout check.',
          coords: { x: 68, y: 28 },
          photos: [],
        },
        reason: 'Weekday foot traffic shifted later this month.',
      },
    });

    const edited = next.places.find((place) => place.id === 'place-temple-view');

    expect(edited.bestTime).toBe('Best after 7 PM');
    expect(next.auditLog[0].actorRole).toBe(ROLES.TRUSTED);
  });
});
