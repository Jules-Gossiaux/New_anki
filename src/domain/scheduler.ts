import type { Card, ReviewRating } from './cards';

export type SchedulingDecision = {
  state: number;
  dueAt: string | null;
  dueDay: number | null;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReviewAt: string;
  scheduledDays: number;
  elapsedDays: number;
  learningSteps: number;
  log: {
    rating: ReviewRating;
    stateBefore: number;
    stateAfter: number;
    reviewedAt: string;
    scheduledDays: number;
    elapsedDays: number;
    stabilityBefore: number | null;
    stabilityAfter: number;
    difficultyBefore: number | null;
    difficultyAfter: number;
  };
};

export type SchedulingPreview = Record<ReviewRating, { dueAt: string; scheduledDays: number }>;

export interface Scheduler {
  preview(card: Card, now: Date): SchedulingPreview;
  schedule(card: Card, rating: ReviewRating, now: Date): SchedulingDecision;
}
