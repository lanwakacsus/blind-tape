import { describe, expect, it } from 'vitest';
import { atr, bollinger, ema, indicatorsFor, rsi, sma } from '../src/engine/indicators';
import { genMarket, makeMarket, type Bar } from '../src/engine/market';

describe('ema', () => {
  it('starts at the simple average and then follows the closes', () => {
    const e = ema([2, 4, 6, 8], 3);
    expect(e.slice(0, 2)).toEqual([null, null]);
    expect(e[2]).toBeCloseTo(4, 12);
    expect(e[3]).toBeCloseTo(8 * 0.5 + 4 * 0.5, 12);
  });

  it('reacts faster than a simple average of the same length', () => {
    const a = [1, 1, 1, 1, 1, 10];
    expect(ema(a, 5)[5]!).toBeGreaterThan(sma(a, 5)[5]!);
  });
});

describe('bollinger', () => {
  it('collapses onto the average when the price does not move', () => {
    const b = bollinger(new Array(30).fill(50), 20, 2);
    expect(b.upper[25]).toBe(50);
    expect(b.lower[25]).toBe(50);
    expect(b.mid[18]).toBeNull();
  });

  it('puts the bands k population standard deviations either side', () => {
    const a = [1, 2, 3, 4, 5];
    const b = bollinger(a, 5, 2);
    const sd = Math.sqrt(2);
    expect(b.mid[4]).toBe(3);
    expect(b.upper[4]).toBeCloseTo(3 + 2 * sd, 12);
    expect(b.lower[4]).toBeCloseTo(3 - 2 * sd, 12);
  });
});

describe('atr', () => {
  const bars = (n: number, range: number): Bar[] => Array.from({ length: n }, () => ({ o: 100, h: 100 + range / 2, l: 100 - range / 2, c: 100 }));

  it('equals the bar range when every bar has the same range and no gaps', () => {
    expect(atr(bars(30, 4), 14)[29]).toBeCloseTo(4, 12);
  });

  it('counts a gap as range', () => {
    const b = bars(20, 2);
    b[15] = { o: 110, h: 111, l: 109, c: 110 };
    expect(atr(b, 14)[15]!).toBeGreaterThan(atr(b, 14)[14]! + 0.5);
  });
});

describe('indicatorsFor', () => {
  const m = genMarket(77);

  it('is computed once per market', () => {
    expect(indicatorsFor(m)).toBe(indicatorsFor(m));
  });

  it('cannot see the future: bending later prices leaves earlier values alone', () => {
    const t = 120;
    const bent = makeMarket({ ...m, bars: m.bars.map((b, i) => (i > t ? { ...b, o: b.o * 1.5, h: b.h * 1.5, l: b.l * 1.5, c: b.c * 1.5 } : b)) });
    const [a, b] = [indicatorsFor(m), indicatorsFor(bent)];
    expect(b.ma20.slice(0, t + 1)).toEqual(a.ma20.slice(0, t + 1));
    expect(b.ma50.slice(0, t + 1)).toEqual(a.ma50.slice(0, t + 1));
    expect(b.bb.upper.slice(0, t + 1)).toEqual(a.bb.upper.slice(0, t + 1));
    expect(b.rsi14.slice(0, t + 1)).toEqual(a.rsi14.slice(0, t + 1));
    expect(b.atr14.slice(0, t + 1)).toEqual(a.atr14.slice(0, t + 1));
    expect(b.ma20[t + 5]).not.toEqual(a.ma20[t + 5]);
  });

  it('keeps RSI between 0 and 100', () => {
    for (const v of rsi(m.closes, 14)) if (v != null) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100);
  });
});
