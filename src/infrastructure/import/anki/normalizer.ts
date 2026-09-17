import type {
  AnkiCollection,
  AnkiImportReport,
  AnkiSourceCard,
  AnkiSourceNote,
  NormalizedAnkiCard,
  NormalizedAnkiNote,
} from './types';

const FIELD_SEPARATOR = '\x1f';

function field(note: AnkiSourceNote, names: string[]): string {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return note.fields.find((candidate) => wanted.has(candidate.name.toLowerCase()))?.value ?? '';
}

function clean(value: string): string {
  return value
    .replace(/<(img|audio|source)\b[^>]*>\s*<\/\1>/gi, '')
    .replace(/<(img|audio|source)\b[^>]*\/?>(?:\s*)/gi, '')
    .replace(/<br\s*\/?>(?=.)/gi, '\n')
    .trim();
}

function state(card: AnkiSourceCard): NormalizedAnkiCard['state'] {
  if (card.queue === -1 || (card.type === 0 && card.queue === -1)) return 'suspended';
  if (card.queue === -2) return 'buried';
  if (card.queue === -3) return 'filtered';
  if (card.type === 0 || card.queue === 0) return 'new';
  if (card.type === 1 || card.queue === 1) return 'learning';
  if (card.type === 3 || card.queue === 3) return 'relearning';
  return 'review';
}

function fsrsState(
  data: string,
): Pick<NormalizedAnkiCard, 'stability' | 'difficulty' | 'lastReviewAt'> {
  try {
    const parsed: unknown = JSON.parse(data || '{}');
    if (!parsed || typeof parsed !== 'object')
      return { stability: null, difficulty: null, lastReviewAt: null };
    const record = parsed as Record<string, unknown>;
    const stability = typeof record.s === 'number' && Number.isFinite(record.s) ? record.s : null;
    const difficulty = typeof record.d === 'number' && Number.isFinite(record.d) ? record.d : null;
    const lastReview = typeof record.lrt === 'number' ? record.lrt : null;
    return {
      stability,
      difficulty,
      lastReviewAt: lastReview ? new Date(lastReview * 1000).toISOString() : null,
    };
  } catch {
    return { stability: null, difficulty: null, lastReviewAt: null };
  }
}

function normalizeCard(
  card: AnkiSourceCard,
  collectionCreatedAt?: number | null,
): NormalizedAnkiCard {
  const collectionDay = collectionCreatedAt ? Math.floor(collectionCreatedAt / 86400) : null;
  return {
    sourceId: card.id,
    sourceNoteId: card.noteId,
    sourceDeckId: card.deckId,
    direction: card.templateOrdinal % 2 === 1 ? 'reverse' : 'forward',
    templateName: card.templateName,
    state: state(card),
    due: state(card) === 'review' && collectionDay !== null ? collectionDay + card.due : card.due,
    interval: card.interval,
    reps: card.reps,
    lapses: card.lapses,
    ...fsrsState(card.data),
  };
}

function normalizeNote(
  note: AnkiSourceNote,
  cards: AnkiSourceCard[],
  collectionCreatedAt?: number | null,
): NormalizedAnkiNote | null {
  const front = clean(
    field(note, ['FrontText', 'Front', 'Question']) || note.fields[0]?.value || '',
  );
  const back = clean(field(note, ['BackText', 'Back', 'Answer']) || note.fields[1]?.value || '');
  if (!front || !back) return null;

  const known = new Set([
    'fronttext',
    'front',
    'question',
    'backtext',
    'back',
    'answer',
    'add reverse',
    'image',
  ]);
  const additional = note.fields
    .filter((candidate) => !known.has(candidate.name.toLowerCase()))
    .map((candidate) => `${candidate.name}: ${clean(candidate.value)}`)
    .filter((value) => !value.endsWith(':'));
  const example = field(note, ['Example', 'Sentence']);
  const extra =
    [...(example ? [`Example: ${clean(example)}`] : []), ...additional].join('\n') || null;

  return {
    sourceId: note.id,
    sourceGuid: note.guid,
    noteTypeName: note.noteTypeName,
    front,
    back,
    example: null,
    extra,
    tags: note.tags,
    cards: cards.map((card) => normalizeCard(card, collectionCreatedAt)),
  };
}

export function normalizeAnkiCollection(collection: AnkiCollection): {
  notes: NormalizedAnkiNote[];
  report: AnkiImportReport;
} {
  const cardsByNote = new Map<number, AnkiSourceCard[]>();
  for (const card of collection.cards) {
    const cards = cardsByNote.get(card.noteId) ?? [];
    cards.push(card);
    cardsByNote.set(card.noteId, cards);
  }

  const notes: NormalizedAnkiNote[] = [];
  const unsupportedCards: AnkiImportReport['unsupportedCards'] = [];
  for (const sourceNote of collection.notes) {
    const sourceCards = cardsByNote.get(sourceNote.id) ?? [];
    if (sourceCards.some((card) => card.templateOrdinal > 1)) {
      for (const card of sourceCards.filter((candidate) => candidate.templateOrdinal > 1)) {
        unsupportedCards.push({ sourceId: card.id, reason: 'Template avancé non supporté.' });
      }
    }
    const normalized = normalizeNote(
      sourceNote,
      sourceCards.filter((card) => card.templateOrdinal <= 1),
      collection.collectionCreatedAt,
    );
    if (normalized) notes.push(normalized);
  }

  const report: AnkiImportReport = {
    sourceFormat: collection.sourceFormat,
    notesRead: collection.notes.length,
    cardsRead: collection.cards.length,
    notesImportable: notes.length,
    cardsImportable: notes.reduce((count, note) => count + note.cards.length, 0),
    unsupportedCards,
    warnings:
      collection.reviews.length === 0 && collection.cards.some((card) => card.reps > 0)
        ? [
            'Le paquet ne contient pas l’historique des révisions, mais certaines cartes semblent déjà étudiées.',
          ]
        : [],
  };
  return { notes, report };
}

export function splitAnkiFields(fields: string): string[] {
  return fields.split(FIELD_SEPARATOR);
}
