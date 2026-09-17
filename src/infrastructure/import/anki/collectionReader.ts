import type { DatabaseClient } from '../../database/client';
import type {
  AnkiCollection,
  AnkiField,
  AnkiSourceCard,
  AnkiSourceDeck,
  AnkiSourceNote,
  AnkiSourceReview,
} from './types';

type Row = Record<string, unknown>;

function number(row: Row, ...keys: string[]): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
      return Number(value);
  }
  return 0;
}

function string(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

function parseJson(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function legacyFields(models: Record<string, unknown>, modelId: number): string[] {
  const model = models[String(modelId)];
  if (!model || typeof model !== 'object') return [];
  const fields = (model as Record<string, unknown>).flds;
  if (!Array.isArray(fields)) return [];
  return fields.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const name = (value as Record<string, unknown>).name;
    return typeof name === 'string' ? [name] : [];
  });
}

function parseTags(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function sourceNote(row: Row, names: string[]): AnkiSourceNote {
  const values = string(row, 'flds').split('\x1f');
  return {
    id: number(row, 'id'),
    guid: string(row, 'guid') || String(number(row, 'id')),
    noteTypeId: number(row, 'mid'),
    noteTypeName: names[number(row, 'mid')] ?? `Anki ${number(row, 'mid')}`,
    fields: values.map((value, index): AnkiField => ({
      name: names[index] ?? `Field ${index + 1}`,
      value,
    })),
    tags: parseTags(string(row, 'tags')),
  };
}

function sourceCard(row: Row, templateNames: Map<string, string[]>): AnkiSourceCard {
  const noteId = number(row, 'nid');
  const noteTypeId = string(row, 'mid');
  const templateOrdinal = number(row, 'ord');
  return {
    id: number(row, 'id'),
    noteId,
    deckId: number(row, 'did'),
    templateOrdinal,
    templateName: templateNames.get(noteTypeId)?.[templateOrdinal] ?? null,
    type: number(row, 'type'),
    queue: number(row, 'queue'),
    due: number(row, 'due'),
    interval: number(row, 'ivl'),
    reps: number(row, 'reps'),
    lapses: number(row, 'lapses'),
    factor: number(row, 'factor'),
    data: string(row, 'data'),
  };
}

function sourceReview(row: Row): AnkiSourceReview {
  return {
    id: number(row, 'id'),
    cardId: number(row, 'cid', 'cardId'),
    reviewedAt: number(row, 'id'),
    ease: number(row, 'ease'),
    interval: number(row, 'ivl'),
    lastInterval: number(row, 'lastIvl'),
    factor: number(row, 'factor'),
    type: number(row, 'type'),
  };
}

export async function readAnkiCollection(
  db: DatabaseClient,
  sourceFormat: AnkiCollection['sourceFormat'],
): Promise<AnkiCollection> {
  if (sourceFormat === 'legacy') return readLegacy(db);
  return readModern(db);
}

async function readLegacy(db: DatabaseClient): Promise<AnkiCollection> {
  const col = await db.getFirstAsync<Row>('SELECT models, decks, crt FROM col LIMIT 1');
  const models = parseJson(col?.models);
  const decksJson = parseJson(col?.decks);
  const decks: AnkiSourceDeck[] = Object.entries(decksJson).flatMap(([id, value]) => {
    if (!value || typeof value !== 'object') return [];
    const name = (value as Record<string, unknown>).name;
    return typeof name === 'string' ? [{ id: Number(id), name }] : [];
  });
  const modelNames = Object.fromEntries(
    Object.entries(models).flatMap(([id, value]) => {
      if (!value || typeof value !== 'object') return [];
      const name = (value as Record<string, unknown>).name;
      return typeof name === 'string' ? [[id, name]] : [];
    }),
  );
  const modelFields = new Map(
    Object.entries(models).flatMap(([id]) => {
      return [[id, legacyFields(models, Number(id))]] as [string, string[]][];
    }),
  );
  const templateNames = new Map(
    Object.entries(models).flatMap(([id]) => {
      const model = models[id] as Record<string, unknown>;
      const tmpls = Array.isArray(model.tmpls) ? model.tmpls : [];
      return [
        [
          id,
          tmpls.map((template) =>
            template &&
            typeof template === 'object' &&
            typeof (template as Record<string, unknown>).name === 'string'
              ? ((template as Record<string, unknown>).name as string)
              : '',
          ),
        ],
      ] as [string, string[]][];
    }),
  );
  const noteRows = await db.getAllAsync<Row>('SELECT id, guid, mid, flds, tags FROM notes');
  const notes = noteRows.map((row) =>
    sourceNote(row, modelFields.get(String(number(row, 'mid'))) ?? []),
  );
  const cards = (
    await db.getAllAsync<Row>(
      'SELECT cards.id, cards.nid, cards.did, cards.ord, cards.type, cards.queue, cards.due, cards.ivl, cards.reps, cards.lapses, cards.factor, cards.data, notes.mid FROM cards JOIN notes ON notes.id = cards.nid',
    )
  ).map((row) => sourceCard(row, templateNames));
  const reviews = (
    await db.getAllAsync<Row>('SELECT id, cid, ease, ivl, lastIvl, factor, type FROM revlog')
  ).map(sourceReview);
  return {
    collectionCreatedAt: number(col ?? {}, 'crt') || null,
    decks,
    notes: notes.map((note) => ({
      ...note,
      noteTypeName: modelNames[String(note.noteTypeId)] ?? note.noteTypeName,
    })),
    cards,
    reviews,
    sourceFormat: 'legacy',
  };
}

async function readModern(db: DatabaseClient): Promise<AnkiCollection> {
  const noteTypes = await db.getAllAsync<Row>('SELECT * FROM notetypes');
  const fields = await db.getAllAsync<Row>('SELECT * FROM fields ORDER BY ntid, ord');
  const templates = await db.getAllAsync<Row>('SELECT * FROM templates ORDER BY ntid, ord');
  const modelNames: Record<string, string> = Object.fromEntries(
    noteTypes.map((row) => [String(number(row, 'id')), string(row, 'name')]),
  );
  const modelFields = new Map<string, string[]>();
  for (const row of fields) {
    const id = String(number(row, 'ntid', 'mid'));
    const values = modelFields.get(id) ?? [];
    values[number(row, 'ord')] = string(row, 'name') || `Field ${number(row, 'ord') + 1}`;
    modelFields.set(id, values);
  }
  const templateNames = new Map<string, string[]>();
  for (const row of templates) {
    const id = String(number(row, 'ntid', 'mid'));
    const values = templateNames.get(id) ?? [];
    values[number(row, 'ord')] = string(row, 'name') || `Template ${number(row, 'ord') + 1}`;
    templateNames.set(id, values);
  }
  const decks = (await db.getAllAsync<Row>('SELECT * FROM decks')).map((row) => ({
    id: number(row, 'id'),
    name: string(row, 'name'),
  }));
  const noteRows = await db.getAllAsync<Row>('SELECT * FROM notes');
  const notes = noteRows.map((row) =>
    sourceNote(row, modelFields.get(String(number(row, 'mid'))) ?? []),
  );
  const cards = (
    await db.getAllAsync<Row>(
      'SELECT cards.*, notes.mid FROM cards JOIN notes ON notes.id = cards.nid',
    )
  ).map((row) => sourceCard(row, templateNames));
  const reviews = (await db.getAllAsync<Row>('SELECT * FROM revlog')).map(sourceReview);
  const collectionInfo = await db.getFirstAsync<Row>('SELECT crt FROM col LIMIT 1');
  return {
    collectionCreatedAt: number(collectionInfo ?? {}, 'crt') || null,
    decks,
    notes: notes.map((note) => ({
      ...note,
      noteTypeName: modelNames[String(note.noteTypeId)] ?? note.noteTypeName,
    })),
    cards,
    reviews,
    sourceFormat: 'modern',
  };
}
