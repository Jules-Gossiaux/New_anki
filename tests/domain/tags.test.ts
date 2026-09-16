import { normalizeTagName, normalizeTagNames } from '../../src/domain/tags';

describe('tags', () => {
  it('normalizes names and removes empty or duplicate values', () => {
    expect(normalizeTagName('  Travail ')).toBe('travail');
    expect(normalizeTagNames([' Travail ', 'travail', '', '  '])).toEqual(['travail']);
  });
});
