import { unzipSync } from 'fflate';
import { buildAnkiPackage } from '../../src/infrastructure/export/anki/legacy';

jest.mock('expo-file-system', () => ({
  Directory: class {
    public uri = 'file:///cache/anki-export-db';
    public constructor() {}
    public create(): void {}
  },
  File: class {
    public constructor() {}
    public delete(): void {}
    public write(): void {}
  },
  Paths: { cache: {} },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(async () => undefined),
    runAsync: jest.fn(async () => ({ changes: 0, lastInsertRowId: 0 })),
    serializeAsync: jest.fn(async () => new TextEncoder().encode('SQLite format 3\0')),
    closeAsync: jest.fn(async () => undefined),
  })),
}));

const mockedOpenDatabase = jest.requireMock('expo-sqlite').openDatabaseAsync as jest.Mock;

describe('Anki export package', () => {
  it('writes a collection and an empty media manifest', async () => {
    const bytes = await buildAnkiPackage({
      decks: [{ id: 'deck-1', name: 'Anglais', parent_id: null }],
      notes: [
        {
          id: 'note-1',
          note_type: 'basic',
          front: 'hello',
          back: 'bonjour',
          example: null,
          extra: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      cards: [
        {
          id: 'card-1',
          note_id: 'note-1',
          deck_id: 'deck-1',
          template_key: 'basic-forward',
          state: 0,
          due_at: null,
          due_day: null,
          stability: null,
          difficulty: null,
          last_review_at: null,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      reviews: [],
      tagsByNote: new Map([['note-1', ['anglais']]]),
      limitsByDeck: new Map([['deck-1', { newCardsPerDay: 20, reviewsPerDay: 200 }]]),
      settings: {
        newCardsPerDay: 20,
        reviewsPerDay: 200,
        learningSteps: ['1m', '10m'],
        relearningSteps: ['10m'],
        priorityDeckId: null,
        interventionPromptMode: 'notification',
        usageReminderMinutes: 3,
        unlockInterventionCards: 3,
        appUsageInterventionCards: 5,
        showStudyNotes: true,
      },
    });

    const archive = unzipSync(bytes);
    expect(archive['collection.anki2']).toBeDefined();
    expect(new TextDecoder().decode(archive.media)).toBe('{}');
    const database = await mockedOpenDatabase.mock.results[0].value;
    const cardInsert = database.runAsync.mock.calls.find(([query]: [string]) =>
      query.includes('INSERT INTO cards'),
    );
    expect(cardInsert?.[0]).toContain('lapses, left, odue, odid, flags, data) VALUES');
    expect(cardInsert?.[0]).toContain('?, 0, 0, 0, 0, ?)');
    expect(cardInsert?.at(-1)).toBe('{}');
  });
});
