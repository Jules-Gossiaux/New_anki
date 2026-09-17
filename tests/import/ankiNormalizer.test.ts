import {
  normalizeAnkiCollection,
  splitAnkiFields,
} from '../../src/infrastructure/import/anki/normalizer';
import type { AnkiCollection } from '../../src/infrastructure/import/anki/types';

describe('Anki normalizer', () => {
  it('supports the Quizlet extended note type and preserves extra fields and directions', () => {
    const collection: AnkiCollection = {
      collectionCreatedAt: 1764385200,
      sourceFormat: 'modern',
      decks: [{ id: 1, name: 'Ndls 5eme::Mars' }],
      reviews: [],
      notes: [
        {
          id: 11,
          guid: 'guid-11',
          noteTypeId: 1,
          noteTypeName: 'Basic Quizlet Extended',
          fields: [
            { name: 'FrontText', value: 'hello' },
            { name: 'BackText', value: 'bonjour' },
            { name: 'Image', value: '<img src="image.png">' },
            { name: 'Add Reverse', value: 'True' },
          ],
          tags: ['langue', 'quizlet'],
        },
      ],
      cards: [
        {
          id: 101,
          noteId: 11,
          deckId: 1,
          templateOrdinal: 0,
          templateName: 'Normal',
          type: 2,
          queue: 2,
          due: 10,
          interval: 6,
          reps: 3,
          lapses: 0,
          factor: 0,
          data: '{"s":12.5,"d":4.2,"lrt":1700000000}',
        },
        {
          id: 102,
          noteId: 11,
          deckId: 1,
          templateOrdinal: 1,
          templateName: 'Reverse',
          type: 2,
          queue: 2,
          due: 11,
          interval: 7,
          reps: 4,
          lapses: 1,
          factor: 0,
          data: '{}',
        },
      ],
    };

    const result = normalizeAnkiCollection(collection);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toMatchObject({
      front: 'hello',
      back: 'bonjour',
      tags: ['langue', 'quizlet'],
    });
    expect(result.notes[0].extra).toBeNull();
    expect(result.notes[0].cards.map((card) => card.direction)).toEqual(['forward', 'reverse']);
    expect(result.notes[0].cards[0].stability).toBe(12.5);
    expect(result.notes[0].cards[0].due).toBe(Math.floor(1764385200 / 86400) + 10);
    expect(result.report.cardsImportable).toBe(2);
  });

  it('reports advanced template cards instead of importing them silently', () => {
    const collection: AnkiCollection = {
      sourceFormat: 'legacy',
      decks: [],
      reviews: [],
      notes: [
        {
          id: 1,
          guid: 'g',
          noteTypeId: 1,
          noteTypeName: 'Cloze',
          fields: [{ name: 'Text', value: 'x' }],
          tags: [],
        },
      ],
      cards: [
        {
          id: 2,
          noteId: 1,
          deckId: 1,
          templateOrdinal: 2,
          templateName: 'Cloze',
          type: 0,
          queue: 0,
          due: 0,
          interval: 0,
          reps: 0,
          lapses: 0,
          factor: 0,
          data: '',
        },
      ],
    };
    const result = normalizeAnkiCollection(collection);
    expect(result.report.unsupportedCards).toEqual([
      { sourceId: 2, reason: 'Template avancé non supporté.' },
    ]);
    expect(result.report.cardsImportable).toBe(0);
  });

  it('skips a card whose prompt only contains unsupported image media', () => {
    const collection: AnkiCollection = {
      sourceFormat: 'legacy',
      decks: [{ id: 1, name: 'Images' }],
      reviews: [],
      notes: [
        {
          id: 1,
          guid: 'image-only',
          noteTypeId: 1,
          noteTypeName: 'Basic',
          fields: [
            { name: 'Front', value: '<img src="country.png">' },
            { name: 'Back', value: 'Belgique' },
          ],
          tags: [],
        },
      ],
      cards: [
        {
          id: 2,
          noteId: 1,
          deckId: 1,
          templateOrdinal: 0,
          templateName: 'Card 1',
          type: 0,
          queue: 0,
          due: 0,
          interval: 0,
          reps: 0,
          lapses: 0,
          factor: 0,
          data: '',
        },
      ],
    };

    expect(normalizeAnkiCollection(collection).notes).toEqual([]);
  });

  it('uses Anki’s unit separator for fields', () => {
    expect(splitAnkiFields('a\x1fb\x1fc')).toEqual(['a', 'b', 'c']);
  });
});
