import { DEFAULT_REVIEW_SETTINGS } from '../../src/domain/reviewSettings';
import { ReviewSettingsRepository } from '../../src/infrastructure/repositories/reviewSettingsRepository';
import type { DatabaseClient } from '../../src/infrastructure/database/client';

describe('ReviewSettingsRepository', () => {
  it('returns defaults when no settings have been saved', async () => {
    const db: DatabaseClient = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getAllAsync: jest.fn(async () => []),
      getFirstAsync: jest.fn(),
    };

    await expect(new ReviewSettingsRepository(db).get()).resolves.toEqual(DEFAULT_REVIEW_SETTINGS);
  });

  it('saves all settings in one transaction', async () => {
    const db: DatabaseClient = {
      execAsync: jest.fn(),
      runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
    };
    const settings = {
      ...DEFAULT_REVIEW_SETTINGS,
      newCardsPerDay: 10,
      reviewsPerDay: 100,
    };

    await new ReviewSettingsRepository(db).save(settings);

    expect(db.execAsync).toHaveBeenNthCalledWith(1, 'BEGIN IMMEDIATE;');
    expect(db.runAsync).toHaveBeenCalledTimes(7);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_settings'),
      'review.usage_reminder_minutes',
      '3',
      expect.any(String),
    );
    expect(db.execAsync).toHaveBeenLastCalledWith('COMMIT;');
  });
});
