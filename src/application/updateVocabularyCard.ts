import { hasDeepPrimaryContentChange, type UpdateNoteInput } from '../domain/notes';
import {
  CARD_TEMPLATES,
  includesForward,
  includesReverse,
  type TemplateSelection,
} from '../domain/cards';
import type { DatabaseClient } from '../infrastructure/database/client';
import { CardRepository } from '../infrastructure/repositories/cardRepository';
import { NoteRepository } from '../infrastructure/repositories/noteRepository';
import { TagRepository } from '../infrastructure/repositories/tagRepository';

export class UpdateVocabularyCard {
  public constructor(private readonly db: DatabaseClient) {}

  public async execute(
    cardId: string,
    input: UpdateNoteInput,
    templateSelection?: TemplateSelection,
  ) {
    const cardRepository = new CardRepository(this.db);
    const card = await cardRepository.getById(cardId);
    if (!card) throw new Error('Card does not exist.');
    const noteRepository = new NoteRepository(this.db);
    const note = await noteRepository.getById(card.noteId);
    if (!note) throw new Error('Note does not exist.');
    const resetScheduling = hasDeepPrimaryContentChange(note, input);

    await this.db.execAsync('BEGIN IMMEDIATE;');
    try {
      const updatedNote = await noteRepository.update(note.id, input);
      const tags =
        input.tags === undefined
          ? await new TagRepository(this.db).listByNote(note.id)
          : await new TagRepository(this.db).replaceForNote(note.id, input.tags);
      if (resetScheduling) await cardRepository.resetSchedulingByNoteId(note.id);
      if (templateSelection) {
        await this.updateTemplates(cardRepository, note.id, card.deckId, templateSelection);
      }
      await this.db.execAsync('COMMIT;');
      return { note: updatedNote, tags, resetScheduling, templateSelection };
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      throw error;
    }
  }

  private async updateTemplates(
    cardRepository: CardRepository,
    noteId: string,
    deckId: string,
    selection: TemplateSelection,
  ): Promise<void> {
    const existingCards = await cardRepository.listByNote(noteId);
    const hadForward = existingCards.some((card) => card.templateKey === CARD_TEMPLATES.forward);
    const hadReverse = existingCards.some((card) => card.templateKey === CARD_TEMPLATES.reverse);
    const wantsForward = includesForward(selection);
    const wantsReverse = includesReverse(selection);

    for (const card of existingCards) {
      const keep =
        (card.templateKey === CARD_TEMPLATES.forward && wantsForward) ||
        (card.templateKey === CARD_TEMPLATES.reverse && wantsReverse);
      if (!keep) await cardRepository.remove(card.id);
    }

    if (wantsForward && !hadForward) {
      await cardRepository.create({ noteId, deckId, templateKey: CARD_TEMPLATES.forward });
    }
    if (wantsReverse && !hadReverse) {
      await cardRepository.create({ noteId, deckId, templateKey: CARD_TEMPLATES.reverse });
    }
  }
}
