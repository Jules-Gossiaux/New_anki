import type { Card } from '../domain/cards';

export function utcDay(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000,
  );
}

export function isStudyCardAvailable(card: Card, now: Date): boolean {
  if (card.state === 0) return true;
  if (card.state === 1 || card.state === 3) {
    return card.dueAt !== null && new Date(card.dueAt).getTime() <= now.getTime();
  }
  return card.dueDay !== null && card.dueDay <= utcDay(now);
}

export function isScheduledToday(card: Card, now: Date): boolean {
  return (
    card.state !== 0 &&
    ((card.dueAt !== null && utcDay(new Date(card.dueAt)) === utcDay(now)) ||
      (card.dueAt === null && card.dueDay !== null && card.dueDay <= utcDay(now)))
  );
}

export function selectNextStudyCard(
  cards: Card[],
  now: Date,
): { card: Card | null; isEarly: boolean } {
  const available = cards.find((candidate) => isStudyCardAvailable(candidate, now));
  if (available) return { card: available, isEarly: false };
  const early = orderStudyQueue(cards).find((candidate) => isScheduledToday(candidate, now));
  return { card: early ?? null, isEarly: early !== undefined };
}

export function orderStudyQueue(cards: Card[]): Card[] {
  return [...cards].sort((left, right) => {
    const leftDue = left.dueAt !== null ? new Date(left.dueAt).getTime() : left.dueDay;
    const rightDue = right.dueAt !== null ? new Date(right.dueAt).getTime() : right.dueDay;
    return (leftDue ?? Number.MAX_SAFE_INTEGER) - (rightDue ?? Number.MAX_SAFE_INTEGER);
  });
}
