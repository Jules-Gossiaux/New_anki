import { CardRepository } from '../../src/infrastructure/repositories/cardRepository';
import type { DatabaseClient } from '../../src/infrastructure/database/client';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'card-id' }));

describe('CardRepository', () => {
  it('creates a new basic card from an existing note', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const db: DatabaseClient = {
      execAsync: jest.fn(),
      runAsync,
      getAllAsync: jest.fn(),
      getFirstAsync: async <T>() => ({ front: 'hello', back: 'bonjour' }) as T,
    };

    const card = await new CardRepository(db).create({ noteId: 'note-id', deckId: 'deck-id' });

    expect(card).toMatchObject({
      id: 'card-id',
      noteId: 'note-id',
      deckId: 'deck-id',
      templateKey: 'basic-forward',
      state: 0,
      front: 'hello',
      back: 'bonjour',
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO cards'),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      0,
      0,
      0,
      expect.anything(),
      expect.anything(),
    );
  });
});
