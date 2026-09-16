import type { CreateNoteInput } from '../domain/notes';
import { CARD_TEMPLATES } from '../domain/cards';
import { CardRepository } from '../infrastructure/repositories/cardRepository';
import type { DatabaseClient } from '../infrastructure/database/client';
import { NoteRepository } from '../infrastructure/repositories/noteRepository';

export class CreateVocabularyCard {
  public constructor(private readonly db: DatabaseClient) {}

  public async execute(deckId: string, input: CreateNoteInput) {
    await this.db.execAsync('BEGIN IMMEDIATE;');
    try {
      const note = await new NoteRepository(this.db).create(input);
      const cardRepository = new CardRepository(this.db);
      const card = await cardRepository.create({
        noteId: note.id,
        deckId,
        templateKey: CARD_TEMPLATES.forward,
      });
      const reverseCard = await cardRepository.create({
        noteId: note.id,
        deckId,
        templateKey: CARD_TEMPLATES.reverse,
      });
      await this.db.execAsync('COMMIT;');
      return { note, card, reverseCard };
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      throw error;
    }
  }
}
