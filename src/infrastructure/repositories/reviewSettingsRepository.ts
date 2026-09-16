import {
  DEFAULT_REVIEW_SETTINGS,
  type ReviewStep,
  type ReviewSettings,
  validateReviewSettings,
} from '../../domain/reviewSettings';
import type { DatabaseClient } from '../database/client';

const keys = {
  newCardsPerDay: 'review.new_cards_per_day',
  reviewsPerDay: 'review.reviews_per_day',
  learningSteps: 'review.learning_steps',
  relearningSteps: 'review.relearning_steps',
} as const;

export class ReviewSettingsRepository {
  public constructor(private readonly db: DatabaseClient) {}

  public async get(): Promise<ReviewSettings> {
    const rows = await this.db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings WHERE key IN (?, ?, ?, ?)',
      keys.newCardsPerDay,
      keys.reviewsPerDay,
      keys.learningSteps,
      keys.relearningSteps,
    );
    const values = new Map(rows.map((row) => [row.key, row.value]));
    return validateReviewSettings({
      newCardsPerDay: this.numberValue(
        values.get(keys.newCardsPerDay),
        DEFAULT_REVIEW_SETTINGS.newCardsPerDay,
      ),
      reviewsPerDay: this.numberValue(
        values.get(keys.reviewsPerDay),
        DEFAULT_REVIEW_SETTINGS.reviewsPerDay,
      ),
      learningSteps: this.arrayValue(
        values.get(keys.learningSteps),
        DEFAULT_REVIEW_SETTINGS.learningSteps,
      ),
      relearningSteps: this.arrayValue(
        values.get(keys.relearningSteps),
        DEFAULT_REVIEW_SETTINGS.relearningSteps,
      ),
    });
  }

  public async save(settings: ReviewSettings): Promise<void> {
    const validated = validateReviewSettings(settings);
    const timestamp = new Date().toISOString();
    const entries: [string, string][] = [
      [keys.newCardsPerDay, String(validated.newCardsPerDay)],
      [keys.reviewsPerDay, String(validated.reviewsPerDay)],
      [keys.learningSteps, JSON.stringify(validated.learningSteps)],
      [keys.relearningSteps, JSON.stringify(validated.relearningSteps)],
    ];
    await this.db.execAsync('BEGIN IMMEDIATE;');
    try {
      for (const [key, value] of entries) {
        await this.db.runAsync(
          `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          key,
          value,
          timestamp,
        );
      }
      await this.db.execAsync('COMMIT;');
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      throw error;
    }
  }

  private numberValue(value: string | undefined, fallback: number): number {
    const parsed = value === undefined ? fallback : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private arrayValue(value: string | undefined, fallback: ReviewStep[]): ReviewStep[] {
    if (value === undefined) return fallback;
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')
        ? parsed.filter((item): item is ReviewStep => /^([1-9]\d*)(m|h|d)$/.test(item))
        : fallback;
    } catch {
      return fallback;
    }
  }
}
