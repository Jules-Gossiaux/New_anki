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
  stability: number | null;
  difficulty: number | null;
  last_review_at: string | null;
  scheduled_days: number;
  elapsed_days: number;
  learning_steps: number;
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
    stability: row.stability,
    difficulty: row.difficulty,
    lastReviewAt: row.last_review_at,
    scheduledDays: row.scheduled_days,
    elapsedDays: row.elapsed_days,
    learningSteps: row.learning_steps,
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

  public async getById(id: string): Promise<Card | null> {
    const row = await this.db.getFirstAsync<CardRow>(
      `SELECT cards.id, cards.note_id, cards.deck_id, cards.template_key, cards.state,
              cards.due_at, cards.due_day, cards.stability, cards.difficulty,
              cards.last_review_at, cards.scheduled_days, cards.elapsed_days, cards.learning_steps,
              cards.reps, cards.lapses, notes.front, notes.back,
              cards.created_at, cards.updated_at
       FROM cards JOIN notes ON notes.id = cards.note_id
       WHERE cards.id = ? AND cards.deleted_at IS NULL AND notes.deleted_at IS NULL`,
      id,
    );
    return row ? toCard(row) : null;
  }

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
      stability: null,
      difficulty: null,
      lastReviewAt: null,
      scheduledDays: 0,
      elapsedDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
      front: note.front,
      back: note.back,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.runAsync(
      `INSERT INTO cards (id, note_id, deck_id, template_key, state, reps, lapses, created_at, updated_at,
                          stability, difficulty, last_review_at, scheduled_days, elapsed_days, learning_steps)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      card.id,
      card.noteId,
      card.deckId,
      card.templateKey,
      card.state,
      card.reps,
      card.lapses,
      card.createdAt,
      card.updatedAt,
      card.stability,
      card.difficulty,
      card.lastReviewAt,
      card.scheduledDays,
      card.elapsedDays,
      card.learningSteps,
    );
    return card;
  }

  public async listByDeck(deckId: string): Promise<Card[]> {
    const rows = await this.db.getAllAsync<CardRow>(
      `SELECT cards.id, cards.note_id, cards.deck_id, cards.template_key, cards.state,
              cards.due_at, cards.due_day, cards.stability, cards.difficulty,
              cards.last_review_at, cards.scheduled_days, cards.elapsed_days, cards.learning_steps,
              cards.reps, cards.lapses,
              notes.front, notes.back, cards.created_at, cards.updated_at
       FROM cards JOIN notes ON notes.id = cards.note_id
       WHERE cards.deck_id = ? AND cards.deleted_at IS NULL AND notes.deleted_at IS NULL
       ORDER BY cards.created_at ASC`,
      deckId,
    );
    return rows.map(toCard);
  }

  public async listDueForStudy(deckId: string, now: Date): Promise<Card[]> {
    const today = Math.floor(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000,
    );
    const rows = await this.db.getAllAsync<CardRow>(
      `WITH RECURSIVE descendants(id) AS (
         SELECT id FROM decks WHERE id = ? AND deleted_at IS NULL
         UNION ALL
         SELECT decks.id FROM decks JOIN descendants ON decks.parent_id = descendants.id
         WHERE decks.deleted_at IS NULL
       )
       SELECT cards.id, cards.note_id, cards.deck_id, cards.template_key, cards.state,
              cards.due_at, cards.due_day, cards.stability, cards.difficulty,
              cards.last_review_at, cards.scheduled_days, cards.elapsed_days, cards.learning_steps,
              cards.reps, cards.lapses, notes.front, notes.back,
              cards.created_at, cards.updated_at
       FROM cards JOIN notes ON notes.id = cards.note_id
       JOIN descendants ON descendants.id = cards.deck_id
       WHERE cards.deleted_at IS NULL AND notes.deleted_at IS NULL
         AND (
           cards.state = 0
           OR (cards.state IN (1, 3) AND cards.due_at IS NOT NULL AND cards.due_at <= ?)
           OR (cards.state = 2 AND cards.due_day IS NOT NULL AND cards.due_day <= ?)
         )
       ORDER BY
         CASE
           WHEN cards.state = 2 AND cards.due_day < ? THEN 0
           WHEN cards.state IN (1, 3) AND cards.due_at <= ? THEN 0
           WHEN cards.state IN (1, 3) THEN 1
           WHEN cards.state = 2 THEN 1
           ELSE 2
         END,
         COALESCE(cards.due_day, ?), COALESCE(cards.due_at, '9999-12-31T23:59:59.999Z'),
         cards.created_at ASC`,
      deckId,
      now.toISOString(),
      today,
      today,
      now.toISOString(),
      today,
    );
    return rows.map(toCard);
  }

  public async applyScheduling(
    id: string,
    decision: {
      state: number;
      dueAt: string | null;
      dueDay: number | null;
      stability: number;
      difficulty: number;
      reps: number;
      lapses: number;
      lastReviewAt: string;
      scheduledDays: number;
      elapsedDays: number;
      learningSteps: number;
    },
  ): Promise<void> {
    const result = await this.db.runAsync(
      `UPDATE cards SET state = ?, due_at = ?, due_day = ?, stability = ?, difficulty = ?,
       reps = ?, lapses = ?, last_review_at = ?, scheduled_days = ?, elapsed_days = ?,
       learning_steps = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
      decision.state,
      decision.dueAt,
      decision.dueDay,
      decision.stability,
      decision.difficulty,
      decision.reps,
      decision.lapses,
      decision.lastReviewAt,
      decision.scheduledDays,
      decision.elapsedDays,
      decision.learningSteps,
      decision.lastReviewAt,
      id,
    );
    if (result.changes === 0) throw new Error('Card does not exist.');
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
