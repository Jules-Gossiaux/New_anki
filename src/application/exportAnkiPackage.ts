import type { DatabaseClient } from '../infrastructure/database/client';
import type { ReviewSettings } from '../domain/reviewSettings';
import { DeckRepository } from '../infrastructure/repositories/deckRepository';
import { buildAnkiPackage, writeAnkiPackage } from '../infrastructure/export/anki/legacy';
import type { File } from 'expo-file-system';

export async function exportAnkiPackage(
  db: DatabaseClient,
  deckId: string,
  settings: ReviewSettings,
): Promise<File> {
  const decks = new DeckRepository(db);
  const deckRows = await db.getAllAsync<{ id: string; name: string; parent_id: string | null }>(
    `WITH RECURSIVE descendants(id) AS (
       SELECT id FROM decks WHERE id = ? AND deleted_at IS NULL
       UNION ALL
       SELECT decks.id FROM decks JOIN descendants ON decks.parent_id = descendants.id
       WHERE decks.deleted_at IS NULL
     )
     SELECT id, name, parent_id FROM decks WHERE id IN (SELECT id FROM descendants)
     ORDER BY parent_id, position, name COLLATE NOCASE`,
    deckId,
  );
  if (deckRows.length === 0) throw new Error('Le deck sélectionné n’existe plus.');

  const ids = deckRows.map((deck) => deck.id);
  const placeholders = ids.map(() => '?').join(', ');
  const notes = await db.getAllAsync<{
    id: string;
    note_type: string;
    front: string;
    back: string;
    example: string | null;
    extra: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT DISTINCT notes.id, notes.note_type, notes.front, notes.back, notes.example,
            notes.extra, notes.created_at, notes.updated_at
     FROM notes JOIN cards ON cards.note_id = notes.id
     WHERE cards.deck_id IN (${placeholders}) AND cards.deleted_at IS NULL AND notes.deleted_at IS NULL
     ORDER BY notes.created_at, notes.id`,
    ...ids,
  );
  const cards = await db.getAllAsync<{
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
    reps: number;
    lapses: number;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, note_id, deck_id, template_key, state, due_at, due_day, stability, difficulty,
            last_review_at, scheduled_days, reps, lapses, created_at, updated_at
     FROM cards WHERE deck_id IN (${placeholders}) AND deleted_at IS NULL
     ORDER BY created_at, id`,
    ...ids,
  );
  const cardIds = cards.map((card) => card.id);
  const reviews = cardIds.length
    ? await db.getAllAsync<{
        id: string;
        card_id: string;
        reviewed_at: string;
        rating: number;
        state_after: number;
        scheduled_days: number | null;
      }>(
        `SELECT id, card_id, reviewed_at, rating, state_after, scheduled_days
         FROM review_logs WHERE card_id IN (${cardIds.map(() => '?').join(', ')})
         ORDER BY reviewed_at, id`,
        ...cardIds,
      )
    : [];
  const tagRows = await db.getAllAsync<{ note_id: string; name: string }>(
    `SELECT note_tags.note_id, tags.name FROM note_tags JOIN tags ON tags.id = note_tags.tag_id
     WHERE note_tags.note_id IN (${notes.map(() => '?').join(', ') || "''"}) ORDER BY tags.name`,
    ...notes.map((note) => note.id),
  );
  const tagsByNote = new Map<string, string[]>();
  for (const tag of tagRows)
    tagsByNote.set(tag.note_id, [...(tagsByNote.get(tag.note_id) ?? []), tag.name]);
  const limitsByDeck = new Map(
    await Promise.all(
      deckRows.map(
        async (deck) => [deck.id, await decks.getEffectiveDailyLimits(deck.id, settings)] as const,
      ),
    ),
  );
  const bytes = await buildAnkiPackage({
    decks: deckRows,
    notes,
    cards,
    reviews,
    tagsByNote,
    limitsByDeck,
    settings,
  });
  const safeName = deckRows[0].name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Vocabulary';
  return writeAnkiPackage(bytes, `${safeName}.apkg`);
}
