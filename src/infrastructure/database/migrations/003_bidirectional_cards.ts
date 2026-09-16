export const bidirectionalCardsMigration = {
  version: 3,
  name: 'bidirectional-cards',
  sql: `
    INSERT INTO cards (
      id, note_id, deck_id, template_key, state, due_at, due_day, stability, difficulty,
      reps, lapses, created_at, updated_at, deleted_at, last_review_at, scheduled_days,
      elapsed_days, learning_steps
    )
    SELECT
      lower(hex(randomblob(16))), cards.note_id, cards.deck_id, 'basic-reverse', 0, NULL, NULL,
      NULL, NULL, 0, 0, cards.created_at, cards.updated_at, NULL, NULL, 0, 0, 0
    FROM cards
    WHERE cards.template_key = 'basic-forward'
      AND cards.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM cards reverse_cards
        WHERE reverse_cards.note_id = cards.note_id
          AND reverse_cards.deck_id = cards.deck_id
          AND reverse_cards.template_key = 'basic-reverse'
          AND reverse_cards.deleted_at IS NULL
      );
  `,
} as const;
