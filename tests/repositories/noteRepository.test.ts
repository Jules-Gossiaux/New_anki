import { NoteRepository } from '../../src/infrastructure/repositories/noteRepository';
import type { DatabaseClient } from '../../src/infrastructure/database/client';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'note-id' }));

describe('NoteRepository', () => {
  it('creates a basic note with normalized required content', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const db: DatabaseClient = {
      execAsync: jest.fn(),
      runAsync,
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
    };

    const note = await new NoteRepository(db).create({ front: '  hello ', back: ' bonjour ' });

    expect(note).toMatchObject({
      id: 'note-id',
      noteType: 'basic',
      front: 'hello',
      back: 'bonjour',
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notes'),
      'note-id',
      'basic',
      'hello',
      'bonjour',
      null,
      null,
      note.createdAt,
      note.updatedAt,
    );
  });

  it('rejects notes without a front or back', async () => {
    const db: DatabaseClient = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
    };

    await expect(new NoteRepository(db).create({ front: '', back: 'answer' })).rejects.toThrow(
      'front',
    );
    await expect(new NoteRepository(db).create({ front: 'question', back: ' ' })).rejects.toThrow(
      'back',
    );
  });
});
