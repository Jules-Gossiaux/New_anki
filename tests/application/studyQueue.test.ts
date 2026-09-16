import {
  applyDailyLimits,
  isScheduledToday,
  isStudyCardAvailable,
  orderStudyQueue,
  selectNextStudyCard,
} from '../../src/application/studyQueue';
import { CARD_STATES, type Card } from '../../src/domain/cards';
import { DEFAULT_REVIEW_SETTINGS, getAvailableNewCardCount } from '../../src/domain/reviewSettings';

function card(id: string, state: number, dueAt: string | null): Card {
  return {
    id,
    noteId: `note-${id}`,
    deckId: 'deck-id',
    templateKey: 'basic-forward',
    state,
    dueAt,
    dueDay: null,
    stability: 1,
    difficulty: 5,
    lastReviewAt: null,
    scheduledDays: 0,
    elapsedDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    front: id,
    back: id,
    createdAt: '2026-09-16T08:00:00.000Z',
    updatedAt: '2026-09-16T08:00:00.000Z',
  };
}

describe('studyQueue', () => {
  const now = new Date('2026-09-16T08:00:00.000Z');

  it('keeps future learning cards from today but excludes tomorrow from the session', () => {
    const today = card('today', CARD_STATES.learning, '2026-09-16T08:01:00.000Z');
    const tomorrow = card('tomorrow', CARD_STATES.learning, '2026-09-17T08:01:00.000Z');

    expect(isScheduledToday(today, now)).toBe(true);
    expect(isScheduledToday(tomorrow, now)).toBe(false);
    expect(isStudyCardAvailable(today, now)).toBe(false);
    expect(orderStudyQueue([tomorrow, today]).map((item) => item.id)).toEqual([
      'today',
      'tomorrow',
    ]);
  });

  it('makes a short-term card available at its exact due time', () => {
    const today = card('today', CARD_STATES.learning, '2026-09-16T08:01:00.000Z');
    expect(isStudyCardAvailable(today, new Date('2026-09-16T08:01:00.000Z'))).toBe(true);
  });

  it('selects the nearest future card early when no card is currently available', () => {
    const sixMinutes = card('six-minutes', CARD_STATES.learning, '2026-09-16T08:06:00.000Z');
    const oneMinute = card('one-minute', CARD_STATES.learning, '2026-09-16T08:01:00.000Z');

    const selection = selectNextStudyCard([sixMinutes, oneMinute], now);

    expect(selection.card?.id).toBe('one-minute');
    expect(selection.isEarly).toBe(true);
  });

  it('prioritizes currently available cards before early cards', () => {
    const available = card('available', CARD_STATES.new, null);
    const future = card('future', CARD_STATES.learning, '2026-09-16T08:01:00.000Z');

    const selection = selectNextStudyCard([future, available], now);

    expect(selection.card?.id).toBe('available');
    expect(selection.isEarly).toBe(false);
  });

  it('applies global daily limits while preserving queue order', () => {
    const cards = [
      card('review-1', CARD_STATES.review, '2026-09-16T07:00:00.000Z'),
      card('review-2', CARD_STATES.review, '2026-09-16T07:01:00.000Z'),
      card('new-1', CARD_STATES.new, null),
      card('new-2', CARD_STATES.new, null),
    ];

    expect(
      applyDailyLimits(
        cards,
        { ...DEFAULT_REVIEW_SETTINGS, newCardsPerDay: 1, reviewsPerDay: 1 },
        { newCards: 0, reviews: 0 },
      ).map((item) => item.id),
    ).toEqual(['review-1', 'new-1']);
  });

  it('does not offer cards after a global daily limit was consumed', () => {
    expect(
      applyDailyLimits(
        [card('new', CARD_STATES.new, null), card('review', CARD_STATES.review, now.toISOString())],
        DEFAULT_REVIEW_SETTINGS,
        { newCards: 20, reviews: 200 },
      ),
    ).toEqual([]);
  });

  it('shows only the new cards still available within the daily limit', () => {
    expect(getAvailableNewCardCount(30, 5, 5)).toBe(0);
    expect(getAvailableNewCardCount(10, 5, 3)).toBe(2);
  });
});
