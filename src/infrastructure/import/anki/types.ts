export type AnkiPackageEntry = {
  path: string;
  bytes: Uint8Array;
};

export type AnkiField = {
  name: string;
  value: string;
};

export type AnkiSourceNote = {
  id: number;
  guid: string;
  noteTypeId: number;
  noteTypeName: string;
  fields: AnkiField[];
  tags: string[];
};

export type AnkiSourceCard = {
  id: number;
  noteId: number;
  deckId: number;
  templateOrdinal: number;
  templateName: string | null;
  type: number;
  queue: number;
  due: number;
  interval: number;
  reps: number;
  lapses: number;
  factor: number;
  data: string;
};

export type AnkiSourceDeck = {
  id: number;
  name: string;
};

export type AnkiSourceReview = {
  id: number;
  cardId: number;
  reviewedAt: number;
  ease: number;
  interval: number;
  lastInterval: number;
  factor: number;
  type: number;
};

export type AnkiCollection = {
  /** Unix timestamp (seconds) of the Anki collection creation day. */
  collectionCreatedAt?: number | null;
  decks: AnkiSourceDeck[];
  notes: AnkiSourceNote[];
  cards: AnkiSourceCard[];
  reviews: AnkiSourceReview[];
  sourceFormat: 'legacy' | 'modern';
};

export type NormalizedAnkiCard = {
  sourceId: number;
  sourceNoteId: number;
  sourceDeckId: number;
  direction: 'forward' | 'reverse';
  templateName: string | null;
  state: 'new' | 'learning' | 'review' | 'relearning' | 'suspended' | 'buried' | 'filtered';
  due: number;
  interval: number;
  reps: number;
  lapses: number;
  stability: number | null;
  difficulty: number | null;
  lastReviewAt: string | null;
};

export type NormalizedAnkiNote = {
  sourceId: number;
  sourceGuid: string;
  noteTypeName: string;
  front: string;
  back: string;
  example: string | null;
  extra: string | null;
  tags: string[];
  cards: NormalizedAnkiCard[];
};

export type AnkiImportReport = {
  sourceFormat: 'legacy' | 'modern';
  notesRead: number;
  cardsRead: number;
  notesImportable: number;
  cardsImportable: number;
  unsupportedCards: Array<{ sourceId: number; reason: string }>;
  warnings: string[];
};
