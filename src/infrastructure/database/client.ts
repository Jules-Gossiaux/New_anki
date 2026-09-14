import type { SQLiteBindValue, SQLiteRunResult } from 'expo-sqlite';

export interface DatabaseClient {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SQLiteBindValue[]): Promise<SQLiteRunResult>;
  getAllAsync<T>(source: string, ...params: SQLiteBindValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, ...params: SQLiteBindValue[]): Promise<T | null>;
}
