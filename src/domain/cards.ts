export const CARD_STATES = {
  new: 0,
  learning: 1,
  review: 2,
  relearning: 3,
} as const;

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
  templateKey?: string;
};
