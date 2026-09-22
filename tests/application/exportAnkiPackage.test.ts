import { exportAnkiPackage } from '../../src/application/exportAnkiPackage';
import type { DatabaseClient } from '../../src/infrastructure/database/client';

jest.mock('../../src/infrastructure/export/anki/legacy', () => ({
  buildAnkiPackage: jest.fn(async () => new Uint8Array()),
  writeAnkiPackage: jest.fn(async (_bytes: Uint8Array, name: string) => ({
    uri: `file://${name}`,
  })),
}));

import { buildAnkiPackage, writeAnkiPackage } from '../../src/infrastructure/export/anki/legacy';

const mockBuildAnkiPackage = jest.mocked(buildAnkiPackage);
const mockWriteAnkiPackage = jest.mocked(writeAnkiPackage);

describe('exportAnkiPackage', () => {
  beforeEach(() => {
    mockBuildAnkiPackage.mockClear();
    mockWriteAnkiPackage.mockClear();
  });

  it('qualifies note timestamps when notes and cards share column names', async () => {
    const getAllAsync = jest.fn(async <T>(source: string): Promise<T[]> => {
      if (source.includes('FROM decks WHERE id IN')) {
        return [{ id: 'deck-1', name: 'Anglais', parent_id: null }] as T[];
      }
      if (source.includes('FROM notes JOIN cards')) {
        expect(source).toContain('notes.created_at');
        expect(source).toContain('notes.updated_at');
        return [
          {
            id: 'note-1',
            note_type: 'basic',
            front: 'hello',
            back: 'bonjour',
            example: null,
            extra: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ] as T[];
      }
      if (source.includes('FROM cards WHERE')) {
        return [
          {
            id: 'card-1',
            note_id: 'note-1',
            deck_id: 'deck-1',
            template_key: 'basic-forward',
            state: 0,
            due_at: null,
            due_day: null,
            stability: null,
            difficulty: null,
            last_review_at: null,
            scheduled_days: 0,
            reps: 0,
            lapses: 0,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ] as T[];
      }
      return [];
    }) as DatabaseClient['getAllAsync'];
    const db: DatabaseClient = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getAllAsync,
      getFirstAsync: jest.fn(),
    };

    await exportAnkiPackage(db, 'deck-1', {
      newCardsPerDay: 20,
      reviewsPerDay: 200,
      learningSteps: ['1m', '10m'],
      relearningSteps: ['10m'],
      priorityDeckId: null,
      interventionPromptMode: 'notification',
      usageReminderMinutes: 3,
      unlockInterventionCards: 3,
      appUsageInterventionCards: 5,
      showStudyNotes: true,
    });

    expect(mockBuildAnkiPackage).toHaveBeenCalledTimes(1);
    expect(mockWriteAnkiPackage).toHaveBeenCalledTimes(1);
  });
});
