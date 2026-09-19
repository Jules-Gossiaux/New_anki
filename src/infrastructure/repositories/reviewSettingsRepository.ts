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
  priorityDeckId: 'review.priority_deck_id',
  interventionPromptMode: 'review.intervention_prompt_mode',
  usageReminderMinutes: 'review.usage_reminder_minutes',
  unlockInterventionCards: 'review.unlock_intervention_cards',
  appUsageInterventionCards: 'review.app_usage_intervention_cards',
  showStudyNotes: 'review.show_study_notes',
} as const;

export class ReviewSettingsRepository {
  public constructor(private readonly db: DatabaseClient) {}

  public async get(): Promise<ReviewSettings> {
    const rows = await this.db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings WHERE key IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      keys.newCardsPerDay,
      keys.reviewsPerDay,
      keys.learningSteps,
      keys.relearningSteps,
      keys.priorityDeckId,
      keys.interventionPromptMode,
      keys.usageReminderMinutes,
      keys.unlockInterventionCards,
      keys.appUsageInterventionCards,
      keys.showStudyNotes,
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
      priorityDeckId: values.get(keys.priorityDeckId) || null,
      interventionPromptMode:
        values.get(keys.interventionPromptMode) === 'direct'
          ? 'direct'
          : values.get(keys.interventionPromptMode) === 'overlay' ||
              values.get(keys.interventionPromptMode) === 'overlay_prompt'
            ? 'overlay_prompt'
            : 'notification',
      usageReminderMinutes: this.numberValue(
        values.get(keys.usageReminderMinutes),
        DEFAULT_REVIEW_SETTINGS.usageReminderMinutes,
      ),
      unlockInterventionCards: this.numberValue(
        values.get(keys.unlockInterventionCards),
        DEFAULT_REVIEW_SETTINGS.unlockInterventionCards,
      ),
      appUsageInterventionCards: this.numberValue(
        values.get(keys.appUsageInterventionCards),
        DEFAULT_REVIEW_SETTINGS.appUsageInterventionCards,
      ),
      showStudyNotes: values.get(keys.showStudyNotes) !== 'false',
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
      [keys.priorityDeckId, validated.priorityDeckId ?? ''],
      [keys.interventionPromptMode, validated.interventionPromptMode],
      [keys.usageReminderMinutes, String(validated.usageReminderMinutes)],
      [keys.unlockInterventionCards, String(validated.unlockInterventionCards)],
      [keys.appUsageInterventionCards, String(validated.appUsageInterventionCards)],
      [keys.showStudyNotes, String(validated.showStudyNotes)],
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
