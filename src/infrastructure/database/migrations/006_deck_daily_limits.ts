export const deckDailyLimitsMigration = {
  version: 6,
  name: 'deck-daily-limits',
  sql: `
    CREATE TABLE IF NOT EXISTS deck_daily_limits (
      deck_id TEXT PRIMARY KEY NOT NULL REFERENCES decks(id) ON DELETE RESTRICT,
      new_cards_per_day INTEGER CHECK (new_cards_per_day IS NULL OR new_cards_per_day > 0),
      reviews_per_day INTEGER CHECK (reviews_per_day IS NULL OR reviews_per_day > 0),
      updated_at TEXT NOT NULL
    );
  `,
} as const;
