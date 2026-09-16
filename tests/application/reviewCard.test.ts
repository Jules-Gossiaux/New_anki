import { ReviewCard } from '../../src/application/reviewCard';
import { CARD_STATES, type Card } from '../../src/domain/cards';
import type { Scheduler } from '../../src/domain/scheduler';
import type { DatabaseClient } from '../../src/infrastructure/database/client';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'review-log-id' }));

describe('ReviewCard', () => {
  it('updates the card and appends its review log atomically', async () => {
    const executed: string[] = [];
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const card: Card = {
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
    const db: DatabaseClient = {
      execAsync: jest.fn(async (source: string) => {
        executed.push(source);
      }),
      runAsync,
      getAllAsync: jest.fn(),
      getFirstAsync: async <T>() => card as T,
    };
    const scheduler: Scheduler = {
      preview: jest.fn(),
      schedule: jest.fn(() => ({
        state: CARD_STATES.learning,
        dueAt: '2026-09-15T08:10:00.000Z',
        dueDay: null,
        stability: 1,
        difficulty: 5,
        reps: 1,
        lapses: 0,
        lastReviewAt: '2026-09-15T08:00:00.000Z',
        scheduledDays: 0,
        elapsedDays: 0,
        learningSteps: 1,
        log: {
          rating: 'good',
          stateBefore: CARD_STATES.new,
          stateAfter: CARD_STATES.learning,
          reviewedAt: '2026-09-15T08:00:00.000Z',
          scheduledDays: 0,
          elapsedDays: 0,
          stabilityBefore: null,
          stabilityAfter: 1,
          difficultyBefore: null,
          difficultyAfter: 5,
        },
      })),
    };

    await new ReviewCard(db, scheduler, () => new Date('2026-09-15T08:00:00.000Z')).execute(
      'card-id',
      'good',
    );

    expect(executed).toEqual(['BEGIN IMMEDIATE;', 'COMMIT;']);
    expect(db.runAsync).toHaveBeenCalledTimes(2);
    expect(runAsync.mock.calls[1]).toEqual([
      expect.stringContaining('INSERT INTO review_logs'),
      'review-log-id',
      'card-id',
      '2026-09-15T08:00:00.000Z',
      3,
      0,
      1,
      0,
      0,
      null,
      1,
      null,
      5,
      '1.0.0',
      3,
    ]);
  });
});
