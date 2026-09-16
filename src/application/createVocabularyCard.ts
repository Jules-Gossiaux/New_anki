import type { CreateNoteInput } from '../domain/notes';
import {
  CARD_TEMPLATES,
  includesForward,
  includesReverse,
  type TemplateSelection,
} from '../domain/cards';
import { CardRepository } from '../infrastructure/repositories/cardRepository';
import type { DatabaseClient } from '../infrastructure/database/client';
import { NoteRepository } from '../infrastructure/repositories/noteRepository';
import { TagRepository } from '../infrastructure/repositories/tagRepository';

export class CreateVocabularyCard {
  public constructor(private readonly db: DatabaseClient) {}

  public async execute(
    deckId: string,
    input: CreateNoteInput,
    templateSelection: TemplateSelection = 'both',
  ) {
    await this.db.execAsync('BEGIN IMMEDIATE;');
    try {
      const note = await new NoteRepository(this.db).create(input);
      await new TagRepository(this.db).replaceForNote(note.id, input.tags ?? []);
      const cardRepository = new CardRepository(this.db);
      const card = includesForward(templateSelection)
        ? await cardRepository.create({
            noteId: note.id,
            deckId,
            templateKey: CARD_TEMPLATES.forward,
          })
        : null;
      const reverseCard = includesReverse(templateSelection)
        ? await cardRepository.create({
            noteId: note.id,
            deckId,
            templateKey: CARD_TEMPLATES.reverse,
          })
        : null;
      await this.db.execAsync('COMMIT;');
      return { note, card: card ?? reverseCard!, reverseCard: reverseCard ?? card! };
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      throw error;
    }
  }
}
