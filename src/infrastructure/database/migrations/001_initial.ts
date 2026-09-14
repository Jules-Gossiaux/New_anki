export const initialMigration = {
  version: 1,
  name: 'initial',
  sql: `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      parent_id TEXT REFERENCES decks(id) ON DELETE RESTRICT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_decks_parent_position
      ON decks(parent_id, position, name);

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      note_type TEXT NOT NULL DEFAULT 'basic',
      front TEXT NOT NULL CHECK (length(trim(front)) > 0),
      back TEXT NOT NULL CHECK (length(trim(back)) > 0),
      example TEXT,
      extra TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE RESTRICT,
      deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE RESTRICT,
      template_key TEXT NOT NULL DEFAULT 'basic-forward',
      state INTEGER NOT NULL DEFAULT 0,
      due_at TEXT,
      due_day INTEGER,
      stability REAL,
      difficulty REAL,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_cards_deck_due
      ON cards(deck_id, due_day, due_at, state);
    CREATE INDEX IF NOT EXISTS idx_cards_note ON cards(note_id);

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY NOT NULL,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
      reviewed_at TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
      state_before INTEGER NOT NULL,
      state_after INTEGER NOT NULL,
      scheduled_days INTEGER,
      elapsed_days INTEGER,
      stability_before REAL,
      stability_after REAL,
      difficulty_before REAL,
      difficulty_after REAL,
      app_version TEXT NOT NULL,
      schema_version INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_review_logs_card_reviewed
      ON review_logs(card_id, reviewed_at);

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE RESTRICT,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
      PRIMARY KEY (note_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,
} as const;
