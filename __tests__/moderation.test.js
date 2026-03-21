import { MODERATION_STATES } from '../src/lib/constants';
import { buildModeratorChecklist, canTransitionModeration } from '../src/lib/moderation';

describe('moderation state machine', () => {
  test('allows only valid transitions', () => {
    expect(canTransitionModeration(MODERATION_STATES.DRAFT, MODERATION_STATES.SUBMITTED)).toBe(true);
    expect(canTransitionModeration(MODERATION_STATES.SUBMITTED, MODERATION_STATES.APPROVED)).toBe(true);
    expect(canTransitionModeration(MODERATION_STATES.SUBMITTED, MODERATION_STATES.DRAFT)).toBe(false);
    expect(canTransitionModeration(MODERATION_STATES.APPROVED, MODERATION_STATES.REJECTED)).toBe(false);
  });

  test('builds a concrete moderation checklist', () => {
    const checklist = buildModeratorChecklist({
      coords: { x: 48, y: 22 },
      allowedActions: ['Pre-rolls okay'],
      restrictions: ['No flash photos'],
      evidenceType: 'moderator_scout',
      evidenceNote: 'Observed on two visits.',
    });

    expect(checklist.every((item) => item.done)).toBe(true);
  });
});
