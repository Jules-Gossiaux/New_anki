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

  it('soft-deletes a deck, all descendants and their cards in one transaction', async () => {
    const execAsync = jest.fn();
    const runAsync = jest
      .fn()
      .mockResolvedValueOnce({ changes: 2, lastInsertRowId: 0 })
      .mockResolvedValueOnce({ changes: 3, lastInsertRowId: 0 });
    const db: DatabaseClient = {
      execAsync,
      runAsync,
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
    };

    await new DeckRepository(db).remove('deck-id');

    expect(execAsync).toHaveBeenNthCalledWith(1, 'BEGIN IMMEDIATE;');
    expect(runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE cards'),
      'deck-id',
      expect.any(String),
      expect.any(String),
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE decks'),
      'deck-id',
      expect.any(String),
      expect.any(String),
    );
    expect(execAsync).toHaveBeenNthCalledWith(2, 'COMMIT;');
    expect(execAsync).not.toHaveBeenCalledWith('ROLLBACK;');
  });

  it('rolls back the cascade when deck deletion fails', async () => {
    const execAsync = jest.fn();
    const db: DatabaseClient = {
      execAsync,
      runAsync: jest
        .fn()
        .mockResolvedValueOnce({ changes: 2, lastInsertRowId: 0 })
        .mockResolvedValueOnce({ changes: 0, lastInsertRowId: 0 }),
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
    };

    await expect(new DeckRepository(db).remove('deck-id')).rejects.toThrow('does not exist');
    expect(execAsync).toHaveBeenNthCalledWith(1, 'BEGIN IMMEDIATE;');
    expect(execAsync).toHaveBeenNthCalledWith(2, 'ROLLBACK;');
    expect(execAsync).not.toHaveBeenCalledWith('COMMIT;');
  });
});
