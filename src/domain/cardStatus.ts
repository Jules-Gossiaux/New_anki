import { CARD_STATES, type Card } from './cards';

export type CardDisplayStatus = 'new' | 'notKnown' | 'known';

function utcDay(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000,
  );
}

export function getCardDisplayStatus(card: Card, now: Date): CardDisplayStatus {
  if (card.state === CARD_STATES.new) return 'new';

  if (card.state === CARD_STATES.learning || card.state === CARD_STATES.relearning) {
    return 'notKnown';
  }

  if (card.state === CARD_STATES.review) {
    return card.dueDay !== null && card.dueDay <= utcDay(now) ? 'notKnown' : 'known';
  }

  return 'notKnown';
}
