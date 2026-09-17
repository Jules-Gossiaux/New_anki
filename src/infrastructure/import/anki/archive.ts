import { unzipSync } from 'fflate';
import { decompress as decompressZstd } from 'fzstd';
import type { AnkiPackageEntry } from './types';

const MAX_PACKAGE_BYTES = 100 * 1024 * 1024;
const MAX_ENTRY_BYTES = 50 * 1024 * 1024;

export type AnkiArchive = {
  collection: AnkiPackageEntry;
  format: 'legacy' | 'modern';
  containsMedia: boolean;
};

function isSafeEntryPath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !path.split('/').some((part) => part === '..' || part === '.')
  );
}

function entry(path: string, bytes: Uint8Array): AnkiPackageEntry {
  if (!isSafeEntryPath(path)) throw new Error(`Chemin d’archive invalide : ${path}`);
  if (bytes.byteLength > MAX_ENTRY_BYTES)
    throw new Error(`Entrée d’archive trop volumineuse : ${path}`);
  return { path, bytes };
}

function isZstandard(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0x28 &&
    bytes[1] === 0xb5 &&
    bytes[2] === 0x2f &&
    bytes[3] === 0xfd
  );
}

function hasMediaEntries(bytes: Uint8Array): boolean {
  let manifestBytes = bytes;
  if (isZstandard(bytes)) {
    try {
      manifestBytes = decompressZstd(bytes);
    } catch {
      return true;
    }
  }
  const text = new TextDecoder().decode(manifestBytes).trim();
  if (!text) return false;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      return Object.keys(parsed as Record<string, unknown>).length > 0;
    }
  } catch {
    // Some older packages use one JSON string per line.
  }
  return text.split(/\r?\n/).some((line) => {
    try {
      const parsed: unknown = JSON.parse(line);
      return typeof parsed === 'string' || (parsed !== null && typeof parsed === 'object');
    } catch {
      return line.trim().length > 0;
    }
  });
}

export function extractAnkiArchive(bytes: Uint8Array): AnkiArchive {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PACKAGE_BYTES) {
    throw new Error('Le paquet Anki est vide ou dépasse la taille maximale autorisée.');
  }
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error('Le fichier n’est pas un paquet Anki ZIP valide.');
  }
  const entries = new Map<string, AnkiPackageEntry>();
  for (const [path, fileBytes] of Object.entries(files)) entries.set(path, entry(path, fileBytes));

  const modern = entries.get('collection.anki21b');
  const legacy = entries.get('collection.anki2');
  if (!modern && !legacy) throw new Error('Le paquet ne contient aucune collection Anki reconnue.');
  const collection = modern ?? legacy!;
  const manifest = entries.get('media');
  const containsMedia = manifest ? hasMediaEntries(manifest.bytes) : false;
  return { collection, format: modern ? 'modern' : 'legacy', containsMedia };
}

/** Returns the SQLite bytes, transparently decoding modern `.anki21b` collections. */
export function decodeCollectionBytes(archive: AnkiArchive): Uint8Array {
  if (archive.format === 'legacy') return archive.collection.bytes;
  try {
    return decompressZstd(archive.collection.bytes);
  } catch {
    throw new Error('La collection Anki moderne est compressée avec un format non supporté.');
  }
}
