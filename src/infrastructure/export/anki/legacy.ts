import { openDatabaseAsync } from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';
import { strToU8, zipSync } from 'fflate';
import type { ReviewSettings } from '../../../domain/reviewSettings';
import type { DailyCardLimits } from '../../../domain/decks';

type DeckRow = {
  id: string;
  name: string;
  parent_id: string | null;
};

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
  reps: number;
  lapses: number;
  created_at: string;
  updated_at: string;
};

type ReviewRow = {
  id: string;
  card_id: string;
  reviewed_at: string;
  rating: number;
  state_after: number;
  scheduled_days: number | null;
};

type ExportInput = {
  decks: DeckRow[];
  notes: NoteRow[];
  cards: CardRow[];
  reviews: ReviewRow[];
  tagsByNote: Map<string, string[]>;
  limitsByDeck: Map<string, DailyCardLimits>;
  settings: ReviewSettings;
};

const MODEL_ID = 910000000000;
const UTC_DAY_SECONDS = 86400;

function stableId(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 1000000000 + (hash >>> 0);
}

function unixSeconds(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : Math.floor(Date.now() / 1000);
}

function collectionDay(now = new Date()): number {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);
}

function stepSeconds(step: string): number {
  const match = /^(\d+)(m|h|d)$/.exec(step);
  if (!match) return 0;
  const multiplier = { m: 60, h: 3600, d: UTC_DAY_SECONDS }[match[2] as 'm' | 'h' | 'd'];
  return Number(match[1]) * multiplier;
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

function deckPath(deck: DeckRow, byId: Map<string, DeckRow>): string {
  const names: string[] = [];
  let current: DeckRow | undefined = deck;
  while (current) {
    names.unshift(current.name);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return names.join('::');
}

function fsrsData(card: CardRow): string {
  const data: Record<string, number> = {};
  if (card.stability !== null) data.s = card.stability;
  if (card.difficulty !== null) data.d = card.difficulty;
  if (card.last_review_at) data.lrt = unixSeconds(card.last_review_at);
  return json(data);
}

function deckConfig(limits: DailyCardLimits, settings: ReviewSettings): Record<string, unknown> {
  return {
    new: {
      delays: settings.learningSteps.map(stepSeconds),
      ints: [1, 4],
      initialFactor: 2500,
      perDay: limits.newCardsPerDay,
    },
    lapse: {
      delays: settings.relearningSteps.map(stepSeconds),
      mult: 0,
      minInt: 1,
      leechFails: 8,
      leechAction: 0,
    },
    rev: {
      perDay: limits.reviewsPerDay,
      ease4: 1.3,
      fuzz: 0.05,
      ivlFct: 1,
      maxIvl: 36500,
      hardFactor: 1.2,
    },
    fsrs: true,
  };
}

async function createLegacyDatabase(input: ExportInput): Promise<Uint8Array> {
  const directory = new Directory(Paths.cache, 'anki-export-db');
  directory.create({ idempotent: true, intermediates: true });
  const databaseFile = new File(directory, `collection-${Date.now()}.db`);
  const database = await openDatabaseAsync(
    databaseFile.name,
    {
      useNewConnection: true,
    },
    directory.uri,
  );
  try {
    await database.execAsync(`
      PRAGMA user_version = 11;
      CREATE TABLE col (id INTEGER PRIMARY KEY, crt INTEGER NOT NULL, mod INTEGER NOT NULL, scm INTEGER NOT NULL, ver INTEGER NOT NULL, dty INTEGER NOT NULL, usn INTEGER NOT NULL, ls INTEGER NOT NULL, conf TEXT NOT NULL, models TEXT NOT NULL, decks TEXT NOT NULL, dconf TEXT NOT NULL, tags TEXT NOT NULL, nextPos INTEGER NOT NULL);
      CREATE TABLE notes (id INTEGER PRIMARY KEY, guid TEXT NOT NULL, mid INTEGER NOT NULL, mod INTEGER NOT NULL, usn INTEGER NOT NULL, tags TEXT NOT NULL, flds TEXT NOT NULL, sfld TEXT NOT NULL, csum INTEGER NOT NULL, flags INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE cards (id INTEGER PRIMARY KEY, nid INTEGER NOT NULL, did INTEGER NOT NULL, ord INTEGER NOT NULL, mod INTEGER NOT NULL, usn INTEGER NOT NULL, type INTEGER NOT NULL, queue INTEGER NOT NULL, due INTEGER NOT NULL, ivl INTEGER NOT NULL, factor INTEGER NOT NULL, reps INTEGER NOT NULL, lapses INTEGER NOT NULL, left INTEGER NOT NULL, odue INTEGER NOT NULL, odid INTEGER NOT NULL, flags INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE revlog (id INTEGER PRIMARY KEY, cid INTEGER NOT NULL, usn INTEGER NOT NULL, ease INTEGER NOT NULL, ivl INTEGER NOT NULL, lastIvl INTEGER NOT NULL, factor INTEGER NOT NULL, time INTEGER NOT NULL, type INTEGER NOT NULL);
      CREATE INDEX ix_notes_usn ON notes (usn);
      CREATE INDEX ix_cards_usn ON cards (usn);
      CREATE INDEX ix_cards_nid ON cards (nid);
      CREATE INDEX ix_cards_sched ON cards (did, queue, due);
      CREATE INDEX ix_revlog_cid ON revlog (cid);
    `);

    const byId = new Map(input.decks.map((deck) => [deck.id, deck]));
    const createdAt = collectionDay();
    const deckJson: Record<string, unknown> = {
      '1': { id: 1, name: 'Default', desc: '', dyn: 0, conf: 1, extendNew: 0, extendRev: 0 },
    };
    const dconfJson: Record<string, unknown> = {
      '1': {
        id: 1,
        name: 'Vocabulary default',
        ...deckConfig(
          input.limitsByDeck.values().next().value ?? {
            newCardsPerDay: input.settings.newCardsPerDay,
            reviewsPerDay: input.settings.reviewsPerDay,
          },
          input.settings,
        ),
      },
    };
    for (const deck of input.decks) {
      const id = stableId(`deck:${deck.id}`);
      const path = deckPath(deck, byId);
      deckJson[String(id)] = {
        id,
        name: path,
        desc: '',
        dyn: 0,
        conf: id,
        extendNew: 0,
        extendRev: 0,
      };
      dconfJson[String(id)] = {
        id,
        name: path,
        ...deckConfig(
          input.limitsByDeck.get(deck.id) ?? {
            newCardsPerDay: input.settings.newCardsPerDay,
            reviewsPerDay: input.settings.reviewsPerDay,
          },
          input.settings,
        ),
      };
    }

    const model = {
      id: MODEL_ID,
      name: 'Vocabulary Basic',
      type: 0,
      mod: Math.floor(Date.now() / 1000),
      usn: -1,
      sortf: 0,
      did: null,
      tmpls: [
        {
          name: 'Mot → traduction',
          ord: 0,
          qfmt: '{{Front}}',
          afmt: '{{FrontSide}}<hr id="answer">{{Back}}',
          did: null,
          bqfmt: '',
          bafmt: '',
        },
        {
          name: 'Traduction → mot',
          ord: 1,
          qfmt: '{{Back}}',
          afmt: '{{FrontSide}}<hr id="answer">{{Front}}',
          did: null,
          bqfmt: '',
          bafmt: '',
        },
      ],
      flds: [
        { name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
        { name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
        { name: 'Example', ord: 2, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
        { name: 'Extra', ord: 3, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
      ],
      css: '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }',
      latexPre: '',
      latexPost: '',
      latexsvg: false,
      req: [
        [0, 'all', [0]],
        [1, 'all', [1]],
      ],
    };

    await database.runAsync(
      'INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags, nextPos) VALUES (1, ?, ?, ?, 11, 0, -1, 0, ?, ?, ?, ?, ?, 0)',
      1,
      createdAt,
      createdAt,
      createdAt,
      json({ schedVer: 2 }),
      json({ [MODEL_ID]: model }),
      json(deckJson),
      json(dconfJson),
      '{}',
    );

    const notesById = new Map(input.notes.map((note) => [note.id, note]));
    for (const note of input.notes) {
      const noteId = stableId(`note:${note.id}`);
      const mod = unixSeconds(note.updated_at);
      const fields = [note.front, note.back, note.example ?? '', note.extra ?? ''];
      await database.runAsync(
        'INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, ?)',
        noteId,
        note.id,
        MODEL_ID,
        mod,
        (input.tagsByNote.get(note.id) ?? []).join(' '),
        fields.join('\x1f'),
        note.front,
        stableId(note.front),
        '{}',
      );
    }

    const cardIds = new Map<string, number>();
    for (const card of input.cards) {
      const note = notesById.get(card.note_id);
      if (!note) continue;
      const cardId = stableId(`card:${card.id}`);
      cardIds.set(card.id, cardId);
      const state = card.state >= 0 && card.state <= 3 ? card.state : 0;
      const isReview = state === 2;
      const due = isReview
        ? (card.due_day ?? 0) - Math.floor(createdAt / UTC_DAY_SECONDS)
        : card.due_at
          ? unixSeconds(card.due_at)
          : 0;
      const ord = card.template_key === 'basic-reverse' ? 1 : 0;
      await database.runAsync(
        'INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?, ?, ?, ?, ?, -1, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)',
        cardId,
        stableId(`note:${note.id}`),
        stableId(`deck:${card.deck_id}`),
        ord,
        unixSeconds(card.updated_at),
        state,
        state,
        due,
        card.scheduled_days,
        state === 0 ? 0 : 2500,
        card.reps,
        card.lapses,
        fsrsData(card),
      );
    }

    for (const review of input.reviews) {
      const cardId = cardIds.get(review.card_id);
      if (!cardId) continue;
      const reviewedAt = unixSeconds(review.reviewed_at) * 1000;
      await database.runAsync(
        'INSERT INTO revlog (id, cid, usn, ease, ivl, lastIvl, factor, time, type) VALUES (?, ?, -1, ?, ?, 0, 2500, 0, ?)',
        reviewedAt + (stableId(`review:${review.id}`) % 1000),
        cardId,
        Math.max(1, Math.min(4, review.rating)),
        review.scheduled_days ?? 0,
        review.state_after === 1 || review.state_after === 3 ? 0 : 1,
      );
    }
    return await database.serializeAsync();
  } finally {
    await database.closeAsync();
    databaseFile.delete();
  }
}

export async function buildAnkiPackage(input: ExportInput): Promise<Uint8Array> {
  const collection = await createLegacyDatabase(input);
  return zipSync({
    'collection.anki2': collection,
    media: strToU8('{}'),
  });
}

export async function writeAnkiPackage(bytes: Uint8Array, name: string): Promise<File> {
  const directory = new Directory(Paths.cache, 'anki-export');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, name);
  file.write(bytes);
  return file;
}

export type { ExportInput };
