import type { DatabaseClient } from '../client';
import { initialMigration } from './001_initial';
import { schedulerStateMigration } from './002_scheduler_state';
import { bidirectionalCardsMigration } from './003_bidirectional_cards';
import { ankiImportMigration } from './004_anki_import';
import { interventionSettingsMigration } from './005_intervention_settings';

const migrations = [
  initialMigration,
  schedulerStateMigration,
  bidirectionalCardsMigration,
  ankiImportMigration,
  interventionSettingsMigration,
];

export async function migrateDatabase(db: DatabaseClient): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const current = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = current?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;

    await db.execAsync('BEGIN IMMEDIATE;');
    try {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }
}

export const latestSchemaVersion = migrations.at(-1)?.version ?? 0;
