import type { Card } from '../domain/cards';
import type { DailyCardLimits } from '../domain/decks';

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
  previousNoteId?: string,
  previousCardId?: string,
): { card: Card | null; isEarly: boolean } {
  const available = cards.filter((candidate) => isStudyCardAvailable(candidate, now));
  if (available.length > 0) {
    return {
      card: preferDifferentNote(available, previousNoteId, previousCardId) ?? null,
      isEarly: false,
    };
  }
  const early = preferDifferentNote(
    orderStudyQueue(cards).filter((candidate) => isScheduledToday(candidate, now)),
    previousNoteId,
    previousCardId,
  );
  return { card: early ?? null, isEarly: early !== undefined };
}

function preferDifferentNote(
  cards: Card[],
  previousNoteId?: string,
  previousCardId?: string,
): Card | undefined {
  if (!previousNoteId) return cards[0];
  return (
    cards.find((candidate) => candidate.noteId !== previousNoteId) ??
    cards.find((candidate) => candidate.id !== previousCardId) ??
    cards[0]
  );
}

export function orderStudyQueue(cards: Card[]): Card[] {
  return [...cards].sort((left, right) => {
    const leftDue = left.dueAt !== null ? new Date(left.dueAt).getTime() : left.dueDay;
    const rightDue = right.dueAt !== null ? new Date(right.dueAt).getTime() : right.dueDay;
    return (leftDue ?? Number.MAX_SAFE_INTEGER) - (rightDue ?? Number.MAX_SAFE_INTEGER);
  });
}

export function applyDailyLimits(
  cards: Card[],
  settings: DailyCardLimits,
  progress: { newCards: number; reviews: number },
): Card[] {
  let newCards = 0;
  let reviews = 0;
  const newRemaining = Math.max(0, settings.newCardsPerDay - progress.newCards);
  const reviewsRemaining = Math.max(0, settings.reviewsPerDay - progress.reviews);

  return cards.filter((card) => {
    if (card.state === 0) {
      if (newCards >= newRemaining) return false;
      newCards += 1;
      return true;
    }
    if (reviews >= reviewsRemaining) return false;
    reviews += 1;
    return true;
  });
}
