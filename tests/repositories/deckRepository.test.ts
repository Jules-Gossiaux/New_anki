import { DeckRepository } from '../../src/infrastructure/repositories/deckRepository';
import type { DatabaseClient } from '../../src/infrastructure/database/client';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'deck-id' }));

describe('DeckRepository', () => {
  it('creates a normalized top-level deck at the next position', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const db: DatabaseClient = {
      execAsync: jest.fn(),
      runAsync,
      getAllAsync: jest.fn(),
      getFirstAsync: async <T>() => ({ max_position: 2 }) as T,
    };

    const deck = await new DeckRepository(db).create({ name: '  English  ' });

    expect(deck.name).toBe('English');
    expect(deck.parentId).toBeNull();
    expect(deck.position).toBe(3);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO decks'),
      'deck-id',
      'English',
      null,
      3,
      deck.createdAt,
      deck.updatedAt,
    );
  });

  it('rejects an empty deck name before touching the database', async () => {
    const db: DatabaseClient = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
    };

    await expect(new DeckRepository(db).create({ name: '   ' })).rejects.toThrow('cannot be empty');
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('does not delete a deck that still has children or cards', async () => {
    const db: DatabaseClient = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
      getFirstAsync: jest
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 }),
    };

    await expect(new DeckRepository(db).remove('deck-id')).rejects.toThrow('must be empty');
    expect(db.runAsync).not.toHaveBeenCalled();
  });
});
