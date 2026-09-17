export const ankiImportMigration = {
  version: 4,
  name: 'anki_import_provenance',
  sql: `
    CREATE TABLE IF NOT EXISTS anki_imports (
      id TEXT PRIMARY KEY NOT NULL,
      source_fingerprint TEXT NOT NULL UNIQUE,
      source_format TEXT NOT NULL CHECK (source_format IN ('legacy', 'modern')),
      source_name TEXT NOT NULL,
      imported_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anki_note_mappings (
      import_id TEXT NOT NULL REFERENCES anki_imports(id) ON DELETE RESTRICT,
      source_note_id INTEGER NOT NULL,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE RESTRICT,
      PRIMARY KEY (import_id, source_note_id),
      UNIQUE (import_id, note_id)
    );

    CREATE TABLE IF NOT EXISTS anki_card_mappings (
      import_id TEXT NOT NULL REFERENCES anki_imports(id) ON DELETE RESTRICT,
      source_card_id INTEGER NOT NULL,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
      PRIMARY KEY (import_id, source_card_id),
      UNIQUE (import_id, card_id)
    );

    CREATE TABLE IF NOT EXISTS anki_review_events (
      import_id TEXT NOT NULL REFERENCES anki_imports(id) ON DELETE RESTRICT,
      source_review_id INTEGER NOT NULL,
      source_card_id INTEGER NOT NULL,
      reviewed_at INTEGER NOT NULL,
      ease INTEGER NOT NULL,
      interval INTEGER NOT NULL,
      last_interval INTEGER NOT NULL,
      factor INTEGER NOT NULL,
      review_type INTEGER NOT NULL,
      PRIMARY KEY (import_id, source_review_id)
    );

    CREATE INDEX IF NOT EXISTS idx_anki_note_mappings_note ON anki_note_mappings(note_id);
    CREATE INDEX IF NOT EXISTS idx_anki_card_mappings_card ON anki_card_mappings(card_id);
    CREATE INDEX IF NOT EXISTS idx_anki_review_events_card ON anki_review_events(import_id, source_card_id, reviewed_at);
  `,
} as const;
