import { describe, expect, it } from 'vitest';
import { FEE, backtest, stats } from '../src/engine/backtest';
import { makeMarket, type Market } from '../src/engine/market';

/** A market from closes only, with `warm` bars of history. */
function tape(closes: number[], warm = 2): Market {
  return makeMarket({
    bars: closes.map((c) => ({ o: c, h: c, l: c, c })),
    warm,
    seed: null,
    regimes: null,
    opts: {},
  });
}

describe('backtest', () => {
  it('charges no fee while the position is unchanged', () => {
    const m = tape([100, 100, 100, 100, 100, 100]);
    // Long from the first decision (index warm-1 = 1) to the end: one entry fee only.
    const r = backtest([0, 1, 1, 1, 1, 1], m);
    expect(r.trades).toBe(1);
    expect(r.eq).toEqual([1, 1 - FEE, 1 - FEE, 1 - FEE, 1 - FEE]);
  });

  it('charges a fee for each change, double for a flip', () => {
    const m = tape([100, 100, 100, 100, 100, 100]);
    const r = backtest([0, 1, 1, -1, 0, 0], m);
    expect(r.trades).toBe(3);
    const after = [1 - FEE, 1 - FEE, (1 - FEE) * (1 - 2 * FEE), (1 - FEE) * (1 - 2 * FEE) * (1 - FEE)];
    r.eq.slice(1).forEach((v, i) => expect(v).toBeCloseTo(after[i], 15));
  });

  it('a flat series pays nothing and stays at 1', () => {
    const r = backtest([0, 0, 0, 0, 0], tape([100, 120, 80, 90, 95]));
    expect(r.trades).toBe(0);
    expect(r.exposure).toBe(0);
    expect(r.eq.every((v) => v === 1)).toBe(true);
  });

  it('applies pos[t] to the move from close t to close t+1, long and short', () => {
    const m = tape([100, 100, 110, 99], 2);
    const long = backtest([0, 1, 1, 1], m);
    expect(long.eq[1]).toBeCloseTo((1 - FEE) * 1.1, 12);
    expect(long.eq[2]).toBeCloseTo((1 - FEE) * 1.1 * 0.9, 12);
    const short = backtest([0, -1, -1, -1], m);
    expect(short.eq[1]).toBeCloseTo((1 - FEE) * 0.9, 12);
    expect(short.eq[2]).toBeCloseTo((1 - FEE) * 0.9 * 1.1, 12);
    expect(long.exposure).toBe(1);
  });

  it('ignores positions before the first tradable bar', () => {
    const m = tape([100, 50, 100, 100], 2);
    const r = backtest([1, 0, 0, 0], m);
    expect(r.trades).toBe(0);
    expect(r.eq).toEqual([1, 1, 1]);
  });

  it('floors equity at zero', () => {
    const m = tape([100, 100, 300, 300], 2);
    const r = backtest([0, -1, -1, -1], m);
    expect(r.eq[1]).toBe(0);
    expect(r.eq[2]).toBe(0);
  });
});

describe('stats', () => {
  it('measures max drawdown from the running peak', () => {
    const s = stats([1, 1.2, 0.9, 1.1, 0.6, 1.5]);
    expect(s.dd).toBeCloseTo(0.6 / 1.2 - 1, 12);
    expect(s.ret).toBeCloseTo(0.5, 12);
  });

  it('reports no drawdown for a curve that never falls', () => {
    expect(stats([1, 1.01, 1.02, 1.05]).dd).toBe(0);
  });

  it('computes an annualised Sharpe from per-bar returns', () => {
    // Per-bar returns +10% then -5%: mean 0.025, sample sd 0.075*sqrt(2).
    const s = stats([1, 1.1, 1.045]);
    expect(s.sharpe).toBeCloseTo((0.025 / (0.075 * Math.SQRT2)) * Math.sqrt(252), 9);
  });

  it('returns a Sharpe of zero when returns have no variance', () => {
    expect(stats([1, 1, 1, 1]).sharpe).toBe(0);
    expect(stats([1, 2, 4, 8]).sharpe).toBe(0);
    expect(stats([1]).sharpe).toBe(0);
  });
});
