export const schedulerStateMigration = {
  version: 2,
  name: 'scheduler-state',
  sql: `
    ALTER TABLE cards ADD COLUMN last_review_at TEXT;
    ALTER TABLE cards ADD COLUMN scheduled_days INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE cards ADD COLUMN elapsed_days INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE cards ADD COLUMN learning_steps INTEGER NOT NULL DEFAULT 0;
  `,
} as const;
