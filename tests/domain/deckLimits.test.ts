import {
  resolveDailyCardLimits,
  validateDeckDailyLimitOverrides,
} from '../../src/domain/deckLimits';

describe('deck daily limits', () => {
  it('inherits global values and applies overrides from root to child', () => {
    expect(
      resolveDailyCardLimits(
        [
          { newCardsPerDay: 12, reviewsPerDay: null },
          { newCardsPerDay: null, reviewsPerDay: 40 },
        ],
        { newCardsPerDay: 20, reviewsPerDay: 200 },
      ),
    ).toEqual({ newCardsPerDay: 12, reviewsPerDay: 40 });
  });

  it('keeps the parent value when a child override is null', () => {
    expect(
      resolveDailyCardLimits(
        [
          { newCardsPerDay: 12, reviewsPerDay: 40 },
          { newCardsPerDay: null, reviewsPerDay: null },
        ],
        { newCardsPerDay: 20, reviewsPerDay: 200 },
      ),
    ).toEqual({ newCardsPerDay: 12, reviewsPerDay: 40 });
  });

  it('validates positive bounded overrides and inheritance', () => {
    expect(validateDeckDailyLimitOverrides({ newCardsPerDay: null, reviewsPerDay: 25 })).toEqual({
      newCardsPerDay: null,
      reviewsPerDay: 25,
    });
    expect(() =>
      validateDeckDailyLimitOverrides({ newCardsPerDay: 0, reviewsPerDay: null }),
    ).toThrow('between 1 and 10000');
  });
});
