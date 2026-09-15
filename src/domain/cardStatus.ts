import { CARD_STATES, type Card } from './cards';

export type CardDisplayStatus = 'new' | 'today' | 'future';

function utcDay(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000,
  );
}

/** Returns the same three scheduling categories used by deck counters. */
export function getCardDisplayStatus(card: Card, now: Date): CardDisplayStatus {
  if (card.state === CARD_STATES.new) return 'new';

  const today = utcDay(now);
  if (card.state === CARD_STATES.review) {
    return card.dueDay !== null && card.dueDay > today ? 'future' : 'today';
  }

  if (card.dueAt === null) return 'today';
  const tomorrowStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return new Date(card.dueAt).getTime() >= tomorrowStart ? 'future' : 'today';
}
