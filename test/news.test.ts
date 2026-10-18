import { describe, expect, it } from 'vitest';
import { LEVELS, genMarket, makeMarket } from '../src/engine/market';
import { HORIZON, makeWire } from '../src/engine/news';

describe('makeWire', () => {
  const m = genMarket(4242, LEVELS[1]);

  it('is deterministic for a market and noise level', () => {
    expect(makeWire(m, 0.2)).toEqual(makeWire(genMarket(4242, LEVELS[1]), 0.2));
  });

  it('never changes the tape itself', () => {
    const before = JSON.stringify(m.bars);
    makeWire(m, 0.5);
    expect(JSON.stringify(m.bars)).toBe(before);
  });

  it('releases headlines only on bars that can still close, sorted by time', () => {
    const wire = makeWire(m, 0.35);
    expect(wire.length).toBeGreaterThan(0);
    wire.forEach((h) => {
      expect(h.at).toBeGreaterThanOrEqual(m.warm - 1);
      expect(h.at).toBeLessThanOrEqual(m.n - 2);
    });
    expect(wire.map((h) => h.at)).toEqual([...wire.map((h) => h.at)].sort((a, b) => a - b));
  });

  it('marks a headline followed only when its regime shows up within the horizon', () => {
    for (const h of makeWire(m, 0.35)) {
      const now = m.regimes!.find((s) => s.from <= h.at + 1 && h.at + 1 <= s.to)?.k;
      const soon = m.regimes!.some((s) => s.k === h.kind && s.from > h.at + 1 && s.from <= h.at + HORIZON);
      expect(h.followed).toBe(now === h.kind || soon);
    }
  });

  it('adds more unfollowed headlines as the noise level rises', () => {
    const unfollowed = (noise: number) => makeWire(m, noise).filter((h) => !h.followed).length;
    expect(unfollowed(0.5)).toBeGreaterThanOrEqual(unfollowed(0));
  });

  it('returns nothing for a tape without a regime schedule', () => {
    const csv = makeMarket({ bars: m.bars, warm: 60, seed: null, regimes: null, opts: {} });
    expect(makeWire(csv, 0.3)).toEqual([]);
  });
});
