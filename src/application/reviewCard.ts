import type { ReviewRating } from '../domain/cards';
import type { Scheduler } from '../domain/scheduler';
import { CardRepository } from '../infrastructure/repositories/cardRepository';
import { ReviewLogRepository } from '../infrastructure/repositories/reviewLogRepository';
import type { DatabaseClient } from '../infrastructure/database/client';

export class ReviewCard {
  public constructor(
    private readonly db: DatabaseClient,
    private readonly scheduler: Scheduler,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async execute(cardId: string, rating: ReviewRating) {
    const cardRepository = new CardRepository(this.db);
    const card = await cardRepository.getById(cardId);
    if (!card) throw new Error('Card does not exist.');
    const decision = this.scheduler.schedule(card, rating, this.now());

    await this.db.execAsync('BEGIN IMMEDIATE;');
    try {
      await cardRepository.applyScheduling(cardId, decision);
      await new ReviewLogRepository(this.db).create(cardId, decision);
      await this.db.execAsync('COMMIT;');
      return { card, decision };
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      throw error;
    }
  }
}
