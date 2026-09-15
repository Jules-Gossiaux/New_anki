import { fsrs, Rating as FsrsRating, State as FsrsState } from 'ts-fsrs';
import type { Card, ReviewRating } from '../../domain/cards';
import type { Scheduler, SchedulingDecision, SchedulingPreview } from '../../domain/scheduler';

const ratings = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
} as const;

const states = new Set([FsrsState.New, FsrsState.Learning, FsrsState.Review, FsrsState.Relearning]);

function toUtcDay(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000,
  );
}

export class FsrsScheduler implements Scheduler {
  private readonly scheduler = fsrs({ enable_fuzz: false });

  public preview(card: Card, now: Date): SchedulingPreview {
    const result = this.scheduler.repeat(this.toFsrsCard(card, now), now);
    return {
      again: {
        dueAt: result[FsrsRating.Again].card.due.toISOString(),
        scheduledDays: result[FsrsRating.Again].log.scheduled_days,
      },
      hard: {
        dueAt: result[FsrsRating.Hard].card.due.toISOString(),
        scheduledDays: result[FsrsRating.Hard].log.scheduled_days,
      },
      good: {
        dueAt: result[FsrsRating.Good].card.due.toISOString(),
        scheduledDays: result[FsrsRating.Good].log.scheduled_days,
      },
      easy: {
        dueAt: result[FsrsRating.Easy].card.due.toISOString(),
        scheduledDays: result[FsrsRating.Easy].log.scheduled_days,
      },
    };
  }

  public schedule(card: Card, rating: ReviewRating, now: Date): SchedulingDecision {
    if (!states.has(card.state)) throw new Error('Card has an invalid scheduling state.');

    const result = this.scheduler.next(this.toFsrsCard(card, now), now, ratings[rating]);
    const next = result.card;
    const log = result.log;

    return {
      state: next.state,
      dueAt: next.due.toISOString(),
      dueDay: next.state === FsrsState.Review ? toUtcDay(next.due) : null,
      stability: next.stability,
      difficulty: next.difficulty,
      reps: next.reps,
      lapses: next.lapses,
      lastReviewAt: now.toISOString(),
      scheduledDays: next.scheduled_days,
      elapsedDays: next.elapsed_days,
      learningSteps: next.learning_steps,
      log: {
        rating,
        stateBefore: card.state,
        stateAfter: next.state,
        reviewedAt: now.toISOString(),
        scheduledDays: log.scheduled_days,
        elapsedDays: log.elapsed_days,
        stabilityBefore: card.stability,
        stabilityAfter: next.stability,
        difficultyBefore: card.difficulty,
        difficultyAfter: next.difficulty,
      },
    };
  }

  private toFsrsCard(card: Card, now: Date) {
    return {
      due: card.dueAt ?? now,
      stability: card.stability ?? 0,
      difficulty: card.difficulty ?? 0,
      elapsed_days: card.elapsedDays,
      scheduled_days: card.scheduledDays,
      learning_steps: card.learningSteps,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.lastReviewAt,
    };
  }
}
