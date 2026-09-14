import { randomUUID } from 'expo-crypto';
import type { Card, CreateCardInput } from '../../domain/cards';
import type { DatabaseClient } from '../database/client';

type CardRow = {
  id: string;
  note_id: string;
  deck_id: string;
  template_key: string;
  state: number;
  due_at: string | null;
  due_day: number | null;
  reps: number;
  lapses: number;
  front: string;
  back: string;
  created_at: string;
  updated_at: string;
};

function toCard(row: CardRow): Card {
  return {
    id: row.id,
    noteId: row.note_id,
    deckId: row.deck_id,
    templateKey: row.template_key,
    state: row.state,
    dueAt: row.due_at,
    dueDay: row.due_day,
    reps: row.reps,
    lapses: row.lapses,
    front: row.front,
    back: row.back,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CardRepository {
  public constructor(private readonly db: DatabaseClient) {}

  public async create(input: CreateCardInput): Promise<Card> {
    const note = await this.db.getFirstAsync<{ front: string; back: string }>(
      'SELECT front, back FROM notes WHERE id = ? AND deleted_at IS NULL',
      input.noteId,
    );
    if (!note) throw new Error('Note does not exist.');
    const timestamp = new Date().toISOString();
    const card: Card = {
      id: randomUUID(),
      noteId: input.noteId,
      deckId: input.deckId,
      templateKey: input.templateKey?.trim() || 'basic-forward',
      state: 0,
      dueAt: null,
      dueDay: null,
      reps: 0,
      lapses: 0,
      front: note.front,
      back: note.back,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.runAsync(
      `INSERT INTO cards (id, note_id, deck_id, template_key, state, reps, lapses, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      card.id,
      card.noteId,
      card.deckId,
      card.templateKey,
      card.state,
      card.reps,
      card.lapses,
      card.createdAt,
      card.updatedAt,
    );
    return card;
  }

  public async listByDeck(deckId: string): Promise<Card[]> {
    const rows = await this.db.getAllAsync<CardRow>(
      `SELECT cards.id, cards.note_id, cards.deck_id, cards.template_key, cards.state,
              cards.due_at, cards.due_day, cards.reps, cards.lapses,
              notes.front, notes.back, cards.created_at, cards.updated_at
       FROM cards JOIN notes ON notes.id = cards.note_id
       WHERE cards.deck_id = ? AND cards.deleted_at IS NULL AND notes.deleted_at IS NULL
       ORDER BY cards.created_at ASC`,
      deckId,
    );
    return rows.map(toCard);
  }

  public async remove(id: string): Promise<void> {
    const result = await this.db.runAsync(
      'UPDATE cards SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      new Date().toISOString(),
      new Date().toISOString(),
      id,
    );
    if (result.changes === 0) throw new Error('Card does not exist.');
  }
}
