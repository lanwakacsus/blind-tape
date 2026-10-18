import { describe, expect, it } from 'vitest';
import { genMarket, makeMarket } from '../src/engine/market';
import { GHOST_AT, ghostPositions, ghostStage, runGhost } from '../src/engine/ghost';

const seeds = Array.from({ length: 20 }, (_, i) => 100 + i * 37);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('ghostStage', () => {
  it('advances with progress and is always the last stage at 3 AM', () => {
    expect([0, 2, 3, 7, 8, 14, 15, 99].map((p) => ghostStage(p))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(GHOST_AT).toHaveLength(4);
    expect(ghostStage(0, true)).toBe(3);
  });
});

describe('ghostPositions', () => {
  const m = genMarket(4242);

  it('is deterministic and covers every bar', () => {
    for (const s of [0, 1, 2, 3] as const) {
      const p = ghostPositions(m, s);
      expect(p).toHaveLength(m.n);
      expect(ghostPositions(m, s)).toEqual(p);
    }
  });

  it('only looks at the past in the careful stage, and at the future in the last', () => {
    // A bar after which the real tape falls, so lifting the future must change what he does.
    const t = m.closes.findIndex((c, i) => i > 100 && i < 200 && m.closes[i + 1] / c < 0.99);
    expect(t).toBeGreaterThan(0);
    // Same tape up to bar t, then a different future.
    const bent = makeMarket({ ...m, bars: m.bars.map((b, i) => (i > t ? { o: b.o * 1.4, h: b.h * 1.4, l: b.l * 1.4, c: b.c * 1.4 } : b)) });
    const same = (s: 0 | 3) => ghostPositions(m, s).slice(0, t + 1).every((p, i) => p === ghostPositions(bent, s)[i]);
    expect(same(0)).toBe(true);
    expect(same(3)).toBe(false);
  });

  it('never takes a bigger position than the whole account', () => {
    for (const s of [0, 1, 2, 3] as const) expect(ghostPositions(m, s).every((p) => Math.abs(p) <= 1)).toBe(true);
  });
});

describe('runGhost', () => {
  it('gets better as he sees further ahead, and ends up unbeatable', () => {
    const avg = (s: 0 | 1 | 2 | 3) => mean(seeds.map((seed) => runGhost(genMarket(seed), s).st.ret));
    expect(avg(2)).toBeGreaterThan(avg(0) + 0.1);
    expect(avg(3)).toBeGreaterThan(avg(2));
    expect(avg(3)).toBeGreaterThan(1);
  });

  it('is erratic, not good, in the middle stage', () => {
    const trades = mean(seeds.map((seed) => runGhost(genMarket(seed), 1).trades));
    const careful = mean(seeds.map((seed) => runGhost(genMarket(seed), 0).trades));
    expect(trades).toBeGreaterThan(careful);
  });
});
