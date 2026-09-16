import { UpdateVocabularyCard } from '../../src/application/updateVocabularyCard';
import { CARD_STATES, type Card } from '../../src/domain/cards';
import type { DatabaseClient } from '../../src/infrastructure/database/client';
import type { SQLiteBindValue } from 'expo-sqlite';

const card: Card = {
  id: 'card-id',
  noteId: 'note-id',
  deckId: 'deck-id',
  templateKey: 'basic-forward',
  state: CARD_STATES.review,
  dueAt: '2026-10-01T08:00:00.000Z',
  dueDay: 20727,
  stability: 10,
  difficulty: 5,
  lastReviewAt: '2026-09-16T08:00:00.000Z',
  scheduledDays: 14,
  elapsedDays: 1,
  learningSteps: 0,
  reps: 3,
  lapses: 0,
  front: 'hello',
  back: 'bonjour',
  createdAt: '2026-09-15T08:00:00.000Z',
  updatedAt: '2026-09-16T08:00:00.000Z',
};

function createDb(): DatabaseClient {
  let read = 0;
  return {
    execAsync: jest.fn(),
    runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(
      async <T>(source: string, ...params: SQLiteBindValue[]): Promise<T | null> => {
        void source;
        void params;
        read += 1;
        return (
          read === 1
            ? card
            : {
                id: 'note-id',
                note_type: 'basic',
                front: 'hello',
                back: 'bonjour',
                example: 'old example',
                extra: 'old extra',
                created_at: '2026-09-15T08:00:00.000Z',
                updated_at: '2026-09-16T08:00:00.000Z',
              }
        ) as T;
      },
    ) as unknown as DatabaseClient['getFirstAsync'],
  };
}

describe('UpdateVocabularyCard', () => {
  it('resets current FSRS state when a primary field changes and keeps history', async () => {
    const db = createDb();

    const result = await new UpdateVocabularyCard(db).execute('card-id', {
      front: 'updated hello',
      back: 'bonjour',
      example: 'new example',
      extra: null,
    });

    expect(result.resetScheduling).toBe(true);
    expect(db.execAsync).toHaveBeenCalledWith('BEGIN IMMEDIATE;');
    expect(db.execAsync).toHaveBeenCalledWith('COMMIT;');
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE cards SET state = 0'),
      expect.any(String),
      'note-id',
    );
  });

  it('keeps FSRS state when only supplemental fields change', async () => {
    const db = createDb();

    const result = await new UpdateVocabularyCard(db).execute('card-id', {
      front: ' hello ',
      back: 'bonjour',
      example: 'new example',
      extra: null,
    });

    expect(result.resetScheduling).toBe(false);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE cards SET state = 0'),
    );
  });
});
