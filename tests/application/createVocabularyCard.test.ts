import { CreateVocabularyCard } from '../../src/application/createVocabularyCard';
import type { DatabaseClient } from '../../src/infrastructure/database/client';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'generated-id' }));

describe('CreateVocabularyCard', () => {
  it('commits note and card creation as one transaction', async () => {
    const executed: string[] = [];
    const db: DatabaseClient = {
      execAsync: jest.fn(async (source: string) => {
        executed.push(source);
      }),
      runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
      getAllAsync: jest.fn(),
      getFirstAsync: async <T>() => ({ front: 'hello', back: 'bonjour' }) as T,
    };

    const result = await new CreateVocabularyCard(db).execute('deck-id', {
      front: 'hello',
      back: 'bonjour',
    });

    expect(result.note.id).toBe('generated-id');
    expect(result.card.noteId).toBe('generated-id');
    expect(executed).toEqual(['BEGIN IMMEDIATE;', 'COMMIT;']);
  });
});
