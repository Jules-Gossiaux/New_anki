import { randomUUID } from 'expo-crypto';
import type { DatabaseClient } from '../database/client';
import type { SchedulingDecision } from '../../domain/scheduler';

export class ReviewLogRepository {
  public constructor(private readonly db: DatabaseClient) {}

  public async create(cardId: string, decision: SchedulingDecision): Promise<void> {
    const log = decision.log;
    await this.db.runAsync(
      `INSERT INTO review_logs (
         id, card_id, reviewed_at, rating, state_before, state_after,
         scheduled_days, elapsed_days, stability_before, stability_after,
         difficulty_before, difficulty_after, app_version, schema_version
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      cardId,
      log.reviewedAt,
      { again: 1, hard: 2, good: 3, easy: 4 }[log.rating],
      log.stateBefore,
      log.stateAfter,
      log.scheduledDays,
      log.elapsedDays,
      log.stabilityBefore,
      log.stabilityAfter,
      log.difficultyBefore,
      log.difficultyAfter,
      '1.0.0',
      3,
    );
  }
}
