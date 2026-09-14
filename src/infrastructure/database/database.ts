import { openDatabaseAsync } from 'expo-sqlite';
import type { DatabaseClient } from './client';
import { migrateDatabase } from './migrations';

export async function initializeDatabase(db: DatabaseClient): Promise<void> {
  await migrateDatabase(db);
}

export async function openVocabularyDatabase(): Promise<DatabaseClient> {
  const db = await openDatabaseAsync('vocabulary.db');
  await initializeDatabase(db);
  return db;
}
