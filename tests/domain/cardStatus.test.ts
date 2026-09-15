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
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const now = new Date('2026-09-15T12:00:00.000Z');

describe('getCardDisplayStatus', () => {
  it('identifies new cards', () => {
    expect(getCardDisplayStatus(baseCard, now)).toBe('new');
  });

  it('identifies learning and relearning cards as not known', () => {
    expect(
      getCardDisplayStatus(
        { ...baseCard, state: CARD_STATES.learning, dueAt: '2026-09-15T13:00:00.000Z' },
        now,
      ),
    ).toBe('notKnown');
    expect(
      getCardDisplayStatus(
        { ...baseCard, state: CARD_STATES.relearning, dueAt: '2026-09-15T11:00:00.000Z' },
        now,
      ),
    ).toBe('notKnown');
  });

  it('identifies review cards as not known or known using their UTC due day', () => {
    const today = Math.floor(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000,
    );
    expect(
      getCardDisplayStatus({ ...baseCard, state: CARD_STATES.review, dueDay: today }, now),
    ).toBe('notKnown');
    expect(
      getCardDisplayStatus({ ...baseCard, state: CARD_STATES.review, dueDay: today + 1 }, now),
    ).toBe('known');
  });
});
