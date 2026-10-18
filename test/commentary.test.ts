import { describe, expect, it } from 'vitest';
import { remark } from '../src/game/commentary';

const first = () => 0;

describe('remark', () => {
  it('sounds like advice at first and like something else later', () => {
    expect(remark({ kind: 'loss' }, 0, first)).toMatch(/cut it/);
    expect(remark({ kind: 'loss' }, 3, first)).toMatch(/exact bar/);
  });

  it('says something for every moment at every stage', () => {
    const moments = [
      { kind: 'enter', side: 1, ahead: null },
      { kind: 'win' },
      { kind: 'loss' },
      { kind: 'stop' },
      { kind: 'trades', n: 8 },
      { kind: 'drawdown' },
      { kind: 'late' },
    ] as const;
    for (const m of moments) for (const s of [0, 1, 2, 3] as const) expect(remark(m, s, first)).toBeTruthy();
  });

  it('only knows what the tape does next once he is far enough gone', () => {
    const intoCrash = { kind: 'enter', side: 1, ahead: 'crash' } as const;
    expect(remark(intoCrash, 1, first)).toMatch(/waited one more bar/);
    expect(remark(intoCrash, 2, first)).toBe("don't.");
    expect(remark({ kind: 'enter', side: -1, ahead: 'crash' }, 3, first)).toMatch(/how did you know/);
    expect(remark({ kind: 'enter', side: 1, ahead: 'melt' }, 2, first)).toBe('yes.');
  });

  it('does the fee arithmetic on the trade count', () => {
    expect(remark({ kind: 'trades', n: 16 }, 0, first)).toContain('1.6% in fees');
  });

  it('does not run off the end of a list', () => {
    expect(remark({ kind: 'win' }, 1, () => 0.999999)).toBeTruthy();
  });
});
