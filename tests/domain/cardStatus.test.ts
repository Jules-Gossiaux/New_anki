import { CARD_STATES, type Card } from '../../src/domain/cards';
import { getCardDisplayStatus } from '../../src/domain/cardStatus';

const baseCard: Card = {
  id: 'card-id',
  noteId: 'note-id',
  deckId: 'deck-id',
  templateKey: 'basic-forward',
  state: CARD_STATES.new,
  dueAt: null,
  dueDay: null,
  stability: null,
  difficulty: null,
  lastReviewAt: null,
  scheduledDays: 0,
  elapsedDays: 0,
  learningSteps: 0,
  reps: 0,
  lapses: 0,
  front: 'hello',
  back: 'bonjour',
  createdAt: '2026-09-16T08:00:00.000Z',
  updatedAt: '2026-09-16T08:00:00.000Z',
};

describe('getCardDisplayStatus', () => {
  const now = new Date('2026-09-16T12:00:00.000Z');
  const tomorrow = Math.floor(Date.UTC(2026, 8, 17) / 86400000);

  it('uses blue/new for cards never studied', () => {
    expect(getCardDisplayStatus(baseCard, now)).toBe('new');
  });

  it('uses red/today for cards scheduled later today', () => {
    expect(
      getCardDisplayStatus(
        { ...baseCard, state: CARD_STATES.learning, dueAt: '2026-09-16T18:00:00.000Z' },
        now,
      ),
    ).toBe('today');
  });

  it('uses green/future for cards scheduled after today', () => {
    expect(
      getCardDisplayStatus({ ...baseCard, state: CARD_STATES.review, dueDay: tomorrow }, now),
    ).toBe('future');
  });
});
