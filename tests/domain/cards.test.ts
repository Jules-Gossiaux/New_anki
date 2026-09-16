import {
  CARD_TEMPLATES,
  getCardSides,
  includesForward,
  includesReverse,
} from '../../src/domain/cards';

describe('card templates', () => {
  it('uses the note front as the prompt for forward cards', () => {
    expect(
      getCardSides({ templateKey: CARD_TEMPLATES.forward, front: 'hello', back: 'bonjour' }),
    ).toEqual({
      prompt: 'hello',
      answer: 'bonjour',
    });
  });

  it('uses the note back as the prompt for reverse cards', () => {
    expect(
      getCardSides({ templateKey: CARD_TEMPLATES.reverse, front: 'hello', back: 'bonjour' }),
    ).toEqual({
      prompt: 'bonjour',
      answer: 'hello',
    });
  });

  it.each([
    ['both', true, true],
    ['forward', true, false],
    ['reverse', false, true],
  ] as const)('maps the %s selection to its directions', (selection, forward, reverse) => {
    expect(includesForward(selection)).toBe(forward);
    expect(includesReverse(selection)).toBe(reverse);
  });
});
