import { zipSync } from 'fflate';
import { extractAnkiArchive } from '../../src/infrastructure/import/anki/archive';

describe('Anki archive extraction', () => {
  it('selects the modern collection', () => {
    const bytes = zipSync({
      'collection.anki2': new Uint8Array([1]),
      'collection.anki21b': new Uint8Array([2]),
    });
    const archive = extractAnkiArchive(bytes);
    expect(archive.format).toBe('modern');
    expect([...archive.collection.bytes]).toEqual([2]);
    expect(archive.containsMedia).toBe(false);
  });

  it('detects non-empty Anki media manifests', () => {
    const bytes = zipSync({
      'collection.anki2': new Uint8Array([1]),
      media: new TextEncoder().encode('{"0":"pays.png","1":"audio.mp3"}'),
    });

    expect(extractAnkiArchive(bytes).containsMedia).toBe(true);
  });

  it('detects a non-empty compressed modern media manifest', () => {
    const compressedManifest = new Uint8Array([
      0x28, 0xb5, 0x2f, 0xfd, 0x20, 17, 137, 0, 0, 123, 34, 48, 34, 58, 34, 105, 109, 97, 103, 101,
      46, 112, 110, 103, 34, 125,
    ]);
    const bytes = zipSync({
      'collection.anki21b': new Uint8Array([2]),
      media: compressedManifest,
    });

    expect(extractAnkiArchive(bytes).containsMedia).toBe(true);
  });

  it('allows an empty media manifest', () => {
    const bytes = zipSync({
      'collection.anki2': new Uint8Array([1]),
      media: new TextEncoder().encode('{}'),
    });

    expect(extractAnkiArchive(bytes).containsMedia).toBe(false);
  });

  it('rejects archive traversal paths before exposing entries', () => {
    const bytes = zipSync({
      '../escape': new Uint8Array([1]),
      'collection.anki2': new Uint8Array([2]),
    });
    expect(() => extractAnkiArchive(bytes)).toThrow('Chemin d’archive invalide');
  });

  it('rejects a ZIP without a collection', () => {
    const bytes = zipSync({ media: new TextEncoder().encode('{}') });
    expect(() => extractAnkiArchive(bytes)).toThrow('aucune collection');
  });
});
