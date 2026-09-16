import { CARD_STATES, type Card } from '../../src/domain/cards';
import { FsrsScheduler } from '../../src/infrastructure/scheduling/fsrsScheduler';

function newCard(): Card {
  return {
    id: 'card-id',
    noteId: 'note-id',
    deckId: 'deck-id',
    templateKey: 'basic-forward',
    state: CARD_STATES.new,
    dueAt: null,
    dueDay: null,
    stability: null,
    difficulty: null,
    lastReviewAt: null,
    scheduledDays: 0,
    elapsedDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    front: 'hello',
    back: 'bonjour',
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-15T08:00:00.000Z',
  };
}

describe('FsrsScheduler', () => {
  it.each(['again', 'hard', 'good', 'easy'] as const)('schedules a new card for %s', (rating) => {
    const now = new Date('2026-09-15T08:00:00.000Z');
    const decision = new FsrsScheduler().schedule(newCard(), rating, now);

    expect(decision.log.rating).toBe(rating);
    expect(decision.log.stateBefore).toBe(CARD_STATES.new);
    expect(decision.state).toBeGreaterThanOrEqual(CARD_STATES.learning);
    expect(decision.stability).toBeGreaterThan(0);
    expect(decision.difficulty).toBeGreaterThan(0);
    expect(decision.lastReviewAt).toBe(now.toISOString());
  });

  it('keeps review cards on a calendar due day', () => {
    const card = {
      ...newCard(),
      state: CARD_STATES.review,
      stability: 5,
      difficulty: 5,
      dueAt: null,
    };
    const decision = new FsrsScheduler().schedule(
      { ...card, lastReviewAt: '2026-09-10T08:00:00.000Z', scheduledDays: 5, elapsedDays: 5 },
      'good',
      new Date('2026-09-15T08:00:00.000Z'),
    );

    expect(decision.dueDay).not.toBeNull();
    expect(decision.dueAt).not.toBeNull();
  });
});
