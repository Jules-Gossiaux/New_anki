export const interventionSettingsMigration = {
  version: 5,
  name: 'intervention-settings',
  sql: `
    INSERT OR IGNORE INTO app_settings (key, value, updated_at)
    VALUES
      ('review.priority_deck_id', '', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      ('review.intervention_prompt_mode', 'notification', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
  `,
} as const;
