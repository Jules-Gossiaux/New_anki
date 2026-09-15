import {
  isShortTermDueToday,
  isStudyCardAvailable,
  orderStudyQueue,
} from '../../src/application/studyQueue';
import { CARD_STATES, type Card } from '../../src/domain/cards';

function card(id: string, state: number, dueAt: string | null): Card {
  return {
    id,
    noteId: `note-${id}`,
    deckId: 'deck-id',
    templateKey: 'basic-forward',
    state,
    dueAt,
    dueDay: null,
    stability: 1,
    difficulty: 5,
    lastReviewAt: null,
    scheduledDays: 0,
    elapsedDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    front: id,
    back: id,
    createdAt: '2026-09-16T08:00:00.000Z',
    updatedAt: '2026-09-16T08:00:00.000Z',
  };
}

describe('studyQueue', () => {
  const now = new Date('2026-09-16T08:00:00.000Z');

  it('keeps future learning cards from today but excludes tomorrow from the session', () => {
    const today = card('today', CARD_STATES.learning, '2026-09-16T08:01:00.000Z');
    const tomorrow = card('tomorrow', CARD_STATES.learning, '2026-09-17T08:01:00.000Z');

    expect(isShortTermDueToday(today, now)).toBe(true);
    expect(isShortTermDueToday(tomorrow, now)).toBe(false);
    expect(isStudyCardAvailable(today, now)).toBe(false);
    expect(orderStudyQueue([tomorrow, today]).map((item) => item.id)).toEqual([
      'today',
      'tomorrow',
    ]);
  });

  it('makes a short-term card available at its exact due time', () => {
    const today = card('today', CARD_STATES.learning, '2026-09-16T08:01:00.000Z');
    expect(isStudyCardAvailable(today, new Date('2026-09-16T08:01:00.000Z'))).toBe(true);
  });
});
