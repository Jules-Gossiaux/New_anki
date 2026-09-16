import { TagRepository } from '../../src/infrastructure/repositories/tagRepository';
import type { DatabaseClient } from '../../src/infrastructure/database/client';
import type { SQLiteBindValue } from 'expo-sqlite';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'tag-id' }));

describe('TagRepository', () => {
  it('normalizes and replaces note tags without deleting tag records', async () => {
    const db: DatabaseClient = {
      execAsync: jest.fn(),
      runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
      getAllAsync: jest.fn(async () => []),
      getFirstAsync: jest.fn(
        async <T>(source: string, ...params: SQLiteBindValue[]): Promise<T | null> => {
          void source;
          void params;
          return { id: 'tag-id' } as T;
        },
      ) as unknown as DatabaseClient['getFirstAsync'],
    };

    await new TagRepository(db).replaceForNote('note-id', [' Travail ', 'travail', 'anglais']);

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tags'),
      'tag-id',
      'travail',
      expect.any(String),
    );
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM note_tags WHERE note_id = ?', 'note-id');
    expect(db.runAsync).toHaveBeenCalledWith(
      'INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)',
      'note-id',
      'tag-id',
    );
  });
});
