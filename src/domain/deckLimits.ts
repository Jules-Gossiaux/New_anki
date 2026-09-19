import type { DailyCardLimits, DeckDailyLimitOverrides } from './decks';

export function resolveDailyCardLimits(
  ancestorsToDeck: DeckDailyLimitOverrides[],
  globalLimits: DailyCardLimits,
): DailyCardLimits {
  return ancestorsToDeck.reduce<DailyCardLimits>(
    (effective, overrides) => ({
      newCardsPerDay: overrides.newCardsPerDay ?? effective.newCardsPerDay,
      reviewsPerDay: overrides.reviewsPerDay ?? effective.reviewsPerDay,
    }),
    globalLimits,
  );
}

export function validateDailyCardLimit(value: number | null, field: string): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 10000) {
    throw new Error(`${field} must be an integer between 1 and 10000, or inherited.`);
  }
  return value;
}

export function validateDeckDailyLimitOverrides(
  overrides: DeckDailyLimitOverrides,
): DeckDailyLimitOverrides {
  return {
    newCardsPerDay: validateDailyCardLimit(overrides.newCardsPerDay, 'New cards per day'),
    reviewsPerDay: validateDailyCardLimit(overrides.reviewsPerDay, 'Reviews per day'),
  };
}
