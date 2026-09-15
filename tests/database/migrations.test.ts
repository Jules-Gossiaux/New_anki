import { migrateDatabase, latestSchemaVersion } from '../../src/infrastructure/database/migrations';
import type { DatabaseClient } from '../../src/infrastructure/database/client';

describe('database migrations', () => {
  it('applies pending migrations in a transaction and records the latest version', async () => {
    const executed: string[] = [];
    const db: DatabaseClient = {
      execAsync: jest.fn(async (source: string) => {
        executed.push(source);
      }),
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
      getFirstAsync: async <T>() => ({ user_version: 0 }) as T,
    };

    await migrateDatabase(db);

    expect(latestSchemaVersion).toBe(1);
    expect(executed).toContain('BEGIN IMMEDIATE;');
    expect(executed).toContain('COMMIT;');
    expect(executed.at(-1)).toBe('COMMIT;');
  });

  it('does not rerun migrations that are already applied', async () => {
    const execAsync = jest.fn<Promise<void>, [string]>(async () => undefined);
    const db: DatabaseClient = {
      execAsync,
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
      getFirstAsync: async <T>() => ({ user_version: latestSchemaVersion }) as T,
    };

    await migrateDatabase(db);

    expect(execAsync).toHaveBeenCalledTimes(1);
    expect(execAsync).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
  });
});
