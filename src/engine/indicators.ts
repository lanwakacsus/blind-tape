/* The indicators the live chart can overlay. Every value at index i uses only bars up to i,
 * so none of them can see the future. Pure: no DOM. */

import type { Bar, Market } from './market';
import { rsi, sma } from './strategies';

export { rsi, sma };

/** Exponential moving average, seeded with the simple average of the first n values. */
export function ema(a: readonly number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(a.length).fill(null);
  const k = 2 / (n + 1);
  let prev = 0;
  for (let i = 0; i < a.length; i++) {
    if (i < n - 1) prev += a[i];
    else if (i === n - 1) out[i] = prev = (prev + a[i]) / n;
    else out[i] = prev = a[i] * k + prev * (1 - k);
  }
  return out;
}

export interface Bands {
  mid: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

/** Bollinger bands: the n-bar average, plus and minus k standard deviations of the closes. */
export function bollinger(a: readonly number[], n: number, k: number): Bands {
  const mid = sma(a as number[], n);
  const upper: (number | null)[] = new Array(a.length).fill(null);
  const lower: (number | null)[] = new Array(a.length).fill(null);
  for (let i = n - 1; i < a.length; i++) {
    const m = mid[i]!;
    let ss = 0;
    for (let j = i - n + 1; j <= i; j++) ss += (a[j] - m) ** 2;
    const sd = Math.sqrt(ss / n);
    upper[i] = m + k * sd;
    lower[i] = m - k * sd;
  }
  return { mid, upper, lower };
}

/** Average true range (Wilder): how far a bar typically travels, gaps included. */
export function atr(bars: readonly Bar[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  let prev = 0;
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i];
    const pc = bars[i - 1].c;
    const tr = Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc));
    if (i < n) prev += tr / n;
    else if (i === n) out[i] = prev = prev + tr / n;
    else out[i] = prev = (prev * (n - 1) + tr) / n;
  }
  return out;
}

export interface IndicatorSet {
  ma20: (number | null)[];
  ma50: (number | null)[];
  bb: Bands;
  rsi14: (number | null)[];
  atr14: (number | null)[];
}

const cache = new WeakMap<Market, IndicatorSet>();

/** Every indicator for a market, computed once. */
export function indicatorsFor(m: Market): IndicatorSet {
  let s = cache.get(m);
  if (!s) {
    s = { ma20: sma(m.closes, 20), ma50: sma(m.closes, 50), bb: bollinger(m.closes, 20, 2), rsi14: rsi(m.closes, 14), atr14: atr(m.bars, 14) };
    cache.set(m, s);
  }
  return s;
}

export interface Indicators {
  ma: boolean;
  bb: boolean;
  vol: boolean;
  rsi: boolean;
  atr: boolean;
}

export const NO_INDICATORS: Indicators = { ma: false, bb: false, vol: false, rsi: false, atr: false };
