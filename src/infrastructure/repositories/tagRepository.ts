import { randomUUID } from 'expo-crypto';
import { normalizeTagNames, type Tag } from '../../domain/tags';
import type { DatabaseClient } from '../database/client';

type TagRow = { id: string; name: string; created_at: string };

function toTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export class TagRepository {
  public constructor(private readonly db: DatabaseClient) {}

  public async listByNote(noteId: string): Promise<Tag[]> {
    const rows = await this.db.getAllAsync<TagRow>(
      `SELECT tags.id, tags.name, tags.created_at
       FROM tags JOIN note_tags ON note_tags.tag_id = tags.id
       WHERE note_tags.note_id = ? ORDER BY tags.name ASC`,
      noteId,
    );
    return rows.map(toTag);
  }

  public async replaceForNote(noteId: string, names: readonly string[]): Promise<Tag[]> {
    const normalizedNames = normalizeTagNames(names);
    for (const name of normalizedNames) {
      await this.db.runAsync(
        `INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)
         ON CONFLICT(name) DO NOTHING`,
        randomUUID(),
        name,
        new Date().toISOString(),
      );
    }

    await this.db.runAsync('DELETE FROM note_tags WHERE note_id = ?', noteId);
    for (const name of normalizedNames) {
      const tag = await this.db.getFirstAsync<{ id: string }>(
        'SELECT id FROM tags WHERE name = ?',
        name,
      );
      if (!tag) throw new Error('Tag could not be created.');
      await this.db.runAsync(
        'INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)',
        noteId,
        tag.id,
      );
    }
    return this.listByNote(noteId);
  }
}
