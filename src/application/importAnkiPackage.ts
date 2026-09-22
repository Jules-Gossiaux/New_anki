import { randomUUID } from 'expo-crypto';
import { CARD_TEMPLATES } from '../domain/cards';
import { NoteRepository } from '../infrastructure/repositories/noteRepository';
import { CardRepository } from '../infrastructure/repositories/cardRepository';
import { DeckRepository } from '../infrastructure/repositories/deckRepository';
import { TagRepository } from '../infrastructure/repositories/tagRepository';
import type { DatabaseClient } from '../infrastructure/database/client';
import type { AnkiCollection, NormalizedAnkiNote } from '../infrastructure/import/anki/types';

type ImportMode = 'new' | 'replace';

export type AnkiImportInput = {
  fingerprint: string;
  sourceName: string;
  collection: AnkiCollection;
  notes: NormalizedAnkiNote[];
  mode?: ImportMode;
};

export type AnkiImportResult = {
  importId: string;
  notesImported: number;
  cardsImported: number;
  reviewsImported: number;
};

function stateNumber(state: NormalizedAnkiNote['cards'][number]['state']): number {
  return { new: 0, learning: 1, review: 2, relearning: 3, suspended: 0, buried: 0, filtered: 0 }[
    state
  ];
}

function dueAt(card: NormalizedAnkiNote['cards'][number]): string | null {
  if (card.state === 'learning' || card.state === 'relearning') {
    return card.due > 100000000 ? new Date(card.due * 1000).toISOString() : null;
  }
  return null;
}

function deckSegments(fullName: string): string[] {
  return fullName
    .split('::')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export async function importAnkiCollection(
  db: DatabaseClient,
  input: AnkiImportInput,
): Promise<AnkiImportResult> {
  const mode = input.mode ?? 'new';
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM anki_imports WHERE source_fingerprint = ?',
    input.fingerprint,
  );
  if (existing && mode !== 'replace') {
    throw new Error('Ce paquet a déjà été importé. Confirme le remplacement pour le réimporter.');
  }

  const importId = existing?.id ?? randomUUID();
  const decks = new DeckRepository(db);
  const notes = new NoteRepository(db);
  const cards = new CardRepository(db);
  const tags = new TagRepository(db);
  const deckIds = new Map<string, string>();
  const existingDecks = await decks.listAll();
  for (const deck of existingDecks) {
    const path = await fullDeckPath(deck.id, existingDecks);
    deckIds.set(path, deck.id);
  }

  await db.execAsync('BEGIN IMMEDIATE;');
  try {
    await db.runAsync(
      `INSERT INTO anki_imports (id, source_fingerprint, source_format, source_name, imported_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(source_fingerprint) DO UPDATE SET source_name = excluded.source_name, imported_at = excluded.imported_at`,
      importId,
      input.fingerprint,
      input.collection.sourceFormat,
      input.sourceName,
      new Date().toISOString(),
    );

    const sourceDecks = new Map(input.collection.decks.map((deck) => [deck.id, deck.name]));
    let cardsImported = 0;
    for (const note of input.notes) {
      const firstCard = note.cards[0];
      const deckName = sourceDecks.get(firstCard?.sourceDeckId) ?? 'Imported Anki';
      const deckId = await ensureDeck(deckName, decks, deckIds);
      const localNoteId =
        (await mappedId(db, 'anki_note_mappings', importId, note.sourceId, 'note_id')) ??
        (
          await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM notes WHERE id = ? AND deleted_at IS NULL',
            note.sourceGuid,
          )
        )?.id ??
        null;
      const noteId =
        localNoteId ??
        (
          await notes.create({
            noteType: note.noteTypeName,
            front: note.front,
            back: note.back,
            example: note.example,
            extra: note.extra,
            tags: note.tags,
          })
        ).id;
      await tags.replaceForNote(noteId, note.tags);
      if (localNoteId) {
        await db.runAsync(
          'UPDATE notes SET note_type = ?, front = ?, back = ?, example = ?, extra = ?, updated_at = ? WHERE id = ?',
          note.noteTypeName,
          note.front,
          note.back,
          note.example,
          note.extra,
          new Date().toISOString(),
          noteId,
        );
      }
      await db.runAsync(
        `INSERT INTO anki_note_mappings (import_id, source_note_id, note_id) VALUES (?, ?, ?)
         ON CONFLICT(import_id, source_note_id) DO UPDATE SET note_id = excluded.note_id`,
        importId,
        note.sourceId,
        noteId,
      );

      for (const sourceCard of note.cards) {
        const localCardId = await mappedId(
          db,
          'anki_card_mappings',
          importId,
          sourceCard.sourceId,
          'card_id',
        );
        const direction =
          sourceCard.direction === 'reverse' ? CARD_TEMPLATES.reverse : CARD_TEMPLATES.forward;
        const stableCard = localCardId
          ? null
          : await db.getFirstAsync<{ id: string }>(
              'SELECT id FROM cards WHERE note_id = ? AND template_key = ? AND deleted_at IS NULL',
              noteId,
              direction,
            );
        const card = await cards.getById(localCardId ?? stableCard?.id ?? '');
        const localCardIdToUse =
          card?.id ??
          (
            await cards.create({
              noteId,
              deckId,
              templateKey: direction,
            })
          ).id;
        if (card) {
          await db.runAsync(
            'UPDATE cards SET deck_id = ?, template_key = ?, updated_at = ? WHERE id = ?',
            deckId,
            direction,
            new Date().toISOString(),
            localCardIdToUse,
          );
        }
        await db.runAsync(
          `UPDATE cards SET state = ?, due_at = ?, due_day = ?, stability = ?, difficulty = ?, reps = ?, lapses = ?,
             last_review_at = ?, scheduled_days = ?, updated_at = ? WHERE id = ?`,
          stateNumber(sourceCard.state),
          dueAt(sourceCard),
          sourceCard.state === 'review' ? sourceCard.due : null,
          sourceCard.stability,
          sourceCard.difficulty,
          sourceCard.reps,
          sourceCard.lapses,
          sourceCard.lastReviewAt,
          sourceCard.interval,
          new Date().toISOString(),
          localCardIdToUse,
        );
        await db.runAsync(
          `INSERT INTO anki_card_mappings (import_id, source_card_id, card_id) VALUES (?, ?, ?)
           ON CONFLICT(import_id, source_card_id) DO UPDATE SET card_id = excluded.card_id`,
          importId,
          sourceCard.sourceId,
          localCardIdToUse,
        );
        cardsImported += 1;
      }
    }
    let reviewsImported = 0;
    for (const review of input.collection.reviews) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO anki_review_events
         (import_id, source_review_id, source_card_id, reviewed_at, ease, interval, last_interval, factor, review_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        importId,
        review.id,
        review.cardId,
        review.reviewedAt,
        review.ease,
        review.interval,
        review.lastInterval,
        review.factor,
        review.type,
      );
      reviewsImported += result.changes;
    }
    await db.execAsync('COMMIT;');
    return { importId, notesImported: input.notes.length, cardsImported, reviewsImported };
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

async function mappedId(
  db: DatabaseClient,
  table: 'anki_note_mappings' | 'anki_card_mappings',
  importId: string,
  sourceId: number,
  column: 'note_id' | 'card_id',
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT ${column} AS value FROM ${table} WHERE import_id = ? AND ${table === 'anki_note_mappings' ? 'source_note_id' : 'source_card_id'} = ?`,
    importId,
    sourceId,
  );
  return row?.value ?? null;
}

async function ensureDeck(
  name: string,
  decks: DeckRepository,
  ids: Map<string, string>,
): Promise<string> {
  let parentId: string | null = null;
  let path = '';
  for (const segment of deckSegments(name)) {
    path = path ? `${path}::${segment}` : segment;
    let id = ids.get(path);
    if (!id) {
      id = (await decks.create({ name: segment, parentId })).id;
      ids.set(path, id);
    }
    parentId = id;
  }
  return parentId ?? (await decks.create({ name: 'Imported Anki' })).id;
}

async function fullDeckPath(
  id: string,
  decks: Awaited<ReturnType<DeckRepository['listAll']>>,
): Promise<string> {
  const byId = new Map(decks.map((deck) => [deck.id, deck]));
  const names: string[] = [];
  let current = byId.get(id);
  while (current) {
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return names.join('::');
}
