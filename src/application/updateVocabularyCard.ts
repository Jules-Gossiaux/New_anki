import { hasDeepPrimaryContentChange, type UpdateNoteInput } from '../domain/notes';
import type { DatabaseClient } from '../infrastructure/database/client';
import { CardRepository } from '../infrastructure/repositories/cardRepository';
import { NoteRepository } from '../infrastructure/repositories/noteRepository';

export class UpdateVocabularyCard {
  public constructor(private readonly db: DatabaseClient) {}

  public async execute(cardId: string, input: UpdateNoteInput) {
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
      if (resetScheduling) await cardRepository.resetSchedulingByNoteId(note.id);
      await this.db.execAsync('COMMIT;');
      return { note: updatedNote, resetScheduling };
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      throw error;
    }
  }
}
