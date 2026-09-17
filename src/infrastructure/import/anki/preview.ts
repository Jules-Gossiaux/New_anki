import { openDatabaseAsync } from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';
import { extractAnkiArchive, decodeCollectionBytes } from './archive';
import { readAnkiCollection } from './collectionReader';
import { normalizeAnkiCollection } from './normalizer';
import type { AnkiCollection, AnkiImportReport, NormalizedAnkiNote } from './types';

export type AnkiPreview = {
  notes: NormalizedAnkiNote[];
  report: AnkiImportReport;
  collection: AnkiCollection;
};

class AnkiMediaNotSupportedError extends Error {
  public constructor() {
    super(
      'Vous essayez d’importer un paquet contenant des images ou d’autres médias. Leur import n’est pas encore possible pour l’instant.',
    );
    this.name = 'AnkiMediaNotSupportedError';
  }
}

/**
 * Reads an `.apkg` into an isolated temporary SQLite database and never writes to Vocabulary.
 * The returned normalized data is the input for the confirmation/import transaction.
 */
export async function previewAnkiPackage(file: File): Promise<AnkiPreview> {
  const archive = extractAnkiArchive(new Uint8Array(await file.arrayBuffer()));
  if (archive.containsMedia) throw new AnkiMediaNotSupportedError();
  const tempDirectory = new Directory(Paths.cache, 'anki-import-preview');
  tempDirectory.create({ idempotent: true, intermediates: true });
  const databaseFile = new File(tempDirectory, `collection-${Date.now()}.db`);
  databaseFile.write(decodeCollectionBytes(archive));

  const sourceDb = await openDatabaseAsync(
    databaseFile.name,
    { useNewConnection: true },
    tempDirectory.uri,
  );
  try {
    const collection = await readAnkiCollection(sourceDb, archive.format);
    const normalized = normalizeAnkiCollection(collection);
    return { ...normalized, collection };
  } finally {
    await sourceDb.closeAsync();
    databaseFile.delete();
  }
}
