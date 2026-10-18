import { describe, expect, it } from 'vitest';
import { genMarket } from '../src/engine/market';
import { PHANTOM_BARS, PHANTOM_FROM, phantomSide, planPhantom } from '../src/game/phantom';

const m = genMarket(31);

describe('planPhantom', () => {
  it('does not happen early in the story', () => {
    expect(planPhantom(m, 0, 99, () => 0)).toBeNull();
    expect(planPhantom(m, 1, 99, () => 0)).toBeNull();
    expect(planPhantom(m, 2, PHANTOM_FROM - 1, () => 0)).toBeNull();
  });

  it('can happen once his bot sees ahead, and at 3 AM whatever the progress', () => {
    expect(planPhantom(m, 2, PHANTOM_FROM, () => 0)).not.toBeNull();
    expect(planPhantom(m, 3, 0, () => 0)).not.toBeNull();
  });

  it('is not every round', () => {
    expect(planPhantom(m, 2, 99, () => 0.9)).toBeNull();
    expect(planPhantom(m, 3, 99, () => 0.9)).toBeNull();
    expect(planPhantom(m, 3, 99, () => 0.8)).not.toBeNull();
  });

  it('picks a bar with room before it and room after it to finish', () => {
    for (const r of [0, 0.3, 0.7, 0.9999]) {
      const bar = planPhantom(m, 3, 99, () => (r === 0.9999 ? 0.5 : r))!;
      expect(bar).toBeGreaterThanOrEqual(m.warm + 25);
      expect(bar).toBeLessThan(m.n - 14);
      expect(bar + PHANTOM_BARS + 2).toBeLessThan(m.n);
    }
  });
});

describe('phantomSide', () => {
  it('goes the way the tape is about to go', () => {
    for (const bar of [70, 100, 130, 160]) {
      const ahead = m.closes[bar + PHANTOM_BARS] / m.closes[bar] - 1;
      expect(phantomSide(m, bar)).toBe(ahead >= 0 ? 1 : -1);
    }
  });

  it('copes with the end of the tape', () => {
    expect([1, -1]).toContain(phantomSide(m, m.n - 1));
  });
});
