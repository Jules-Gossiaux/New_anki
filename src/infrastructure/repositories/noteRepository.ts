import type { DatabaseClient } from '../database/client';
import { randomUUID } from 'expo-crypto';
import {
  assertNoteContent,
  type CreateNoteInput,
  type Note,
  type UpdateNoteInput,
} from '../../domain/notes';

type NoteRow = {
  id: string;
  note_type: string;
  front: string;
  back: string;
  example: string | null;
  extra: string | null;
  created_at: string;
  updated_at: string;
};

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    noteType: row.note_type,
    front: row.front,
    back: row.back,
    example: row.example,
    extra: row.extra,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class NoteRepository {
  public constructor(private readonly db: DatabaseClient) {}

  public async create(input: CreateNoteInput): Promise<Note> {
    const note: Note = {
      id: randomUUID(),
      noteType: input.noteType?.trim() || 'basic',
      front: assertNoteContent(input.front, 'front'),
      back: assertNoteContent(input.back, 'back'),
      example: input.example?.trim() || null,
      extra: input.extra?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.db.runAsync(
      `INSERT INTO notes (id, note_type, front, back, example, extra, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      note.id,
      note.noteType,
      note.front,
      note.back,
      note.example,
      note.extra,
      note.createdAt,
      note.updatedAt,
    );
    return note;
  }

  public async getById(id: string): Promise<Note | null> {
    const row = await this.db.getFirstAsync<NoteRow>(
      `SELECT id, note_type, front, back, example, extra, created_at, updated_at
       FROM notes WHERE id = ? AND deleted_at IS NULL`,
      id,
    );
    return row ? toNote(row) : null;
  }

  public async list(): Promise<Note[]> {
    const rows = await this.db.getAllAsync<NoteRow>(
      `SELECT id, note_type, front, back, example, extra, created_at, updated_at
       FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC`,
    );
    return rows.map(toNote);
  }

  public async update(id: string, input: UpdateNoteInput): Promise<Note> {
    const current = await this.getById(id);
    if (!current) throw new Error('Note does not exist.');
    const updatedAt = new Date().toISOString();
    const note: Note = {
      ...current,
      noteType: input.noteType?.trim() || current.noteType,
      front: assertNoteContent(input.front, 'front'),
      back: assertNoteContent(input.back, 'back'),
      example: input.example?.trim() || null,
      extra: input.extra?.trim() || null,
      updatedAt,
    };
    await this.db.runAsync(
      `UPDATE notes SET note_type = ?, front = ?, back = ?, example = ?, extra = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      note.noteType,
      note.front,
      note.back,
      note.example,
      note.extra,
      note.updatedAt,
      id,
    );
    return note;
  }

  public async remove(id: string): Promise<void> {
    const cards = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM cards WHERE note_id = ? AND deleted_at IS NULL',
      id,
    );
    if ((cards?.count ?? 0) > 0)
      throw new Error('Note must not have active cards before deletion.');
    const result = await this.db.runAsync(
      'UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      new Date().toISOString(),
      new Date().toISOString(),
      id,
    );
    if (result.changes === 0) throw new Error('Note does not exist.');
  }
}
