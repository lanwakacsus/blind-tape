import { describe, expect, it } from 'vitest';
import { QUOTE_OF_THE_DAY } from '../src/game/lore';
import { QUOTES, dayLabel } from '../src/game/quotes';

describe('quotes', () => {
  it('is in date order and ends on the quote of the day', () => {
    const days = QUOTES.map((q) => q.day);
    expect(days).toEqual([...days].sort());
    expect(new Set(days).size).toBe(days.length);
    const last = QUOTES[QUOTES.length - 1];
    expect([last.text, last.source]).toEqual([QUOTE_OF_THE_DAY.text, QUOTE_OF_THE_DAY.source]);
    expect(last.day).toBe('2011-03-14');
  });

  it('starts with real trading lines credited to real people', () => {
    const early = QUOTES.slice(0, 7);
    expect(early.every((q) => /^(attributed to )?[A-Z]/.test(q.source) && q.source !== 'unknown')).toBe(true);
    expect(QUOTES[0].source).toBe('Warren Buffett');
  });

  it('ends up with lines nobody can source', () => {
    const late = QUOTES.slice(-10);
    const unsourced = late.filter((q) => /unknown|overheard|found|written|bus stop|^M\.$|proverb/.test(q.source));
    expect(unsourced.length).toBe(late.length);
  });

  it('does not pin invented words on a real person', () => {
    const real = /Buffett|Templeton|Ricardo|Graham|Soros|Keynes|Pascal|Eliot|Wittgenstein|Shakespeare|Pessoa|Franklin/;
    const invented = ['graph is not the territory', 'nothing after the last bar', 'seed is not a seed', 'always going to be this bar'];
    for (const q of QUOTES) if (real.test(q.source)) expect(invented.some((t) => q.text.includes(t))).toBe(false);
  });

  it('formats dates the way the rest of the site does', () => {
    expect(dayLabel('2011-03-14')).toBe('14 MAR 2011');
    expect(dayLabel('2010-08-03')).toBe('03 AUG 2010');
  });
});
