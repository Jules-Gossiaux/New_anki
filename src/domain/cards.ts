export const CARD_STATES = {
  new: 0,
  learning: 1,
  review: 2,
  relearning: 3,
} as const;

export const CARD_TEMPLATES = {
  forward: 'basic-forward',
  reverse: 'basic-reverse',
} as const;

export type CardTemplateKey = (typeof CARD_TEMPLATES)[keyof typeof CARD_TEMPLATES];
export type TemplateSelection = 'both' | 'forward' | 'reverse';

export const TEMPLATE_SELECTIONS: readonly TemplateSelection[] = ['both', 'forward', 'reverse'];

export function includesForward(selection: TemplateSelection): boolean {
  return selection === 'both' || selection === 'forward';
}

export function includesReverse(selection: TemplateSelection): boolean {
  return selection === 'both' || selection === 'reverse';
}

export function isReverseCard(templateKey: string): boolean {
  return templateKey === CARD_TEMPLATES.reverse;
}

export function getCardSides(card: Pick<Card, 'templateKey' | 'front' | 'back'>): {
  prompt: string;
  answer: string;
} {
  return isReverseCard(card.templateKey)
    ? { prompt: card.back, answer: card.front }
    : { prompt: card.front, answer: card.back };
}

export type Card = {
  id: string;
  noteId: string;
  deckId: string;
  templateKey: string;
  state: number;
  dueAt: string | null;
  dueDay: number | null;
  stability: number | null;
  difficulty: number | null;
  lastReviewAt: string | null;
  scheduledDays: number;
  elapsedDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  front: string;
  back: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type CreateCardInput = {
  noteId: string;
  deckId: string;
  templateKey?: CardTemplateKey;
};
