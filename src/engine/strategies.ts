/* Indicators and the six rule-based bots. Pure: no DOM.
 *
 * A strategy returns pos[], where pos[t] is the position held from close t to close t+1
 * (1 long, -1 short, 0 flat), decided with data up to and including bar t only. */

import type { Bar } from './market';

export type Position = -1 | 0 | 1;
export type Params = Record<string, number | boolean>;

interface ParamBase {
  k: string;
  label: string;
}
export interface NumberParam extends ParamBase {
  type?: 'number';
  v: number;
  min: number;
  max: number;
  /** Omitted means whole numbers only. */
  step?: number;
}
export interface BoolParam extends ParamBase {
  type: 'bool';
  v: boolean;
}
export type ParamDef = NumberParam | BoolParam;

export type StrategyId = 'bh' | 'sma' | 'mom' | 'don' | 'rsi' | 'bb';

export interface Strategy {
  id: StrategyId;
  /** Short ticker-style name shown in the race. */
  call: string;
  name: string;
  /** CSS colour variable. */
  color: string;
  desc: string;
  params: ParamDef[];
  run(closes: number[], p: Params, bars: Bar[]): Position[];
}

/** Simple moving average; null until n values are available. */
export function sma(a: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(a.length).fill(null);
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i];
    if (i >= n) sum -= a[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

/** Wilder's RSI; null until n changes are available. */
export function rsi(a: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(a.length).fill(null);
  let avgGain = 0;
  let avgLoss = 0;
  const value = () => (avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  for (let i = 1; i < a.length; i++) {
    const d = a[i] - a[i - 1];
    const gain = Math.max(d, 0);
    const loss = Math.max(-d, 0);
    if (i <= n) {
      avgGain += gain / n;
      avgLoss += loss / n;
      if (i === n) out[i] = value();
    } else {
      avgGain = (avgGain * (n - 1) + gain) / n;
      avgLoss = (avgLoss * (n - 1) + loss) / n;
      out[i] = value();
    }
  }
  return out;
}

const num = (p: Params, k: string) => p[k] as number;
const flag = (p: Params, k: string) => !!p[k];

function smaCross(c: number[], p: Params): Position[] {
  const fast = sma(c, num(p, 'fast'));
  const slow = sma(c, num(p, 'slow'));
  return c.map((_, i) => {
    const f = fast[i];
    const s = slow[i];
    if (f == null || s == null) return 0;
    if (f > s) return 1;
    return flag(p, 'short') ? -1 : 0;
  });
}

function momentum(c: number[], p: Params): Position[] {
  const look = num(p, 'look');
  return c.map((x, i) => {
    if (i < look) return 0;
    if (x > c[i - look]) return 1;
    return flag(p, 'short') ? -1 : 0;
  });
}

function donchian(c: number[], p: Params, b: Bar[]): Position[] {
  const entry = num(p, 'entry');
  const exit = num(p, 'exit');
  // Highest high / lowest low of the n bars before i (bar i itself excluded).
  const highest = (i: number, n: number) => {
    let m = -Infinity;
    for (let j = i - n; j < i; j++) m = Math.max(m, b[j].h);
    return m;
  };
  const lowest = (i: number, n: number) => {
    let m = Infinity;
    for (let j = i - n; j < i; j++) m = Math.min(m, b[j].l);
    return m;
  };
  const out: Position[] = [];
  let pos: Position = 0;
  for (let i = 0; i < c.length; i++) {
    if (i >= Math.max(entry, exit)) {
      if (pos === 1 && c[i] < lowest(i, exit)) pos = 0;
      else if (pos === -1 && c[i] > highest(i, exit)) pos = 0;
      if (pos <= 0 && c[i] > highest(i, entry)) pos = 1;
      else if (flag(p, 'short') && pos >= 0 && c[i] < lowest(i, entry)) pos = -1;
    }
    out.push(pos);
  }
  return out;
}

function rsiReversion(c: number[], p: Params): Position[] {
  const r = rsi(c, num(p, 'n'));
  let pos: Position = 0;
  return c.map((_, i) => {
    const v = r[i];
    if (v == null) return 0;
    if (pos === 1 && v > 50) pos = 0;
    else if (pos === -1 && v < 50) pos = 0;
    if (pos === 0 && v < num(p, 'lo')) pos = 1;
    else if (flag(p, 'short') && pos === 0 && v > num(p, 'hi')) pos = -1;
    return pos;
  });
}

function bollinger(c: number[], p: Params): Position[] {
  const n = num(p, 'n');
  const k = num(p, 'k');
  const mid = sma(c, n);
  let pos: Position = 0;
  return c.map((x, i) => {
    const m = mid[i];
    if (m == null) return 0;
    let v = 0;
    for (let j = i - n + 1; j <= i; j++) v += (c[j] - m) ** 2;
    const sd = Math.sqrt(v / n);
    if (pos === 1 && x >= m) pos = 0;
    else if (pos === -1 && x <= m) pos = 0;
    if (pos === 0 && x < m - k * sd) pos = 1;
    else if (flag(p, 'short') && pos === 0 && x > m + k * sd) pos = -1;
    return pos;
  });
}

export const STRATS: Strategy[] = [
  {
    id: 'bh',
    call: 'INDEX',
    name: 'Buy & Hold',
    color: '--s0',
    desc: 'Buys on day one and never sells. The benchmark.',
    params: [],
    run: (c) => c.map(() => 1),
  },
  {
    id: 'sma',
    call: 'CROSS',
    name: 'SMA Crossover',
    color: '--s1',
    desc: 'Long while the fast moving average is above the slow one.',
    params: [
      { k: 'fast', label: 'Fast', v: 10, min: 2, max: 59 },
      { k: 'slow', label: 'Slow', v: 40, min: 3, max: 59 },
      { k: 'short', label: 'Short below', type: 'bool', v: false },
    ],
    run: smaCross,
  },
  {
    id: 'mom',
    call: 'MOMO',
    name: 'Momentum',
    color: '--s2',
    desc: 'Long when price is higher than it was N days ago.',
    params: [
      { k: 'look', label: 'Lookback', v: 20, min: 2, max: 59 },
      { k: 'short', label: 'Short if lower', type: 'bool', v: false },
    ],
    run: momentum,
  },
  {
    id: 'don',
    call: 'BREAK',
    name: 'Donchian Breakout',
    color: '--s3',
    desc: 'Buys a close above the N-day high, exits under the M-day low.',
    params: [
      { k: 'entry', label: 'Entry', v: 20, min: 2, max: 59 },
      { k: 'exit', label: 'Exit', v: 10, min: 2, max: 59 },
      { k: 'short', label: 'Short breakdowns', type: 'bool', v: false },
    ],
    run: donchian,
  },
  {
    id: 'rsi',
    call: 'SNAP',
    name: 'RSI Reversion',
    color: '--s4',
    desc: 'Buys when RSI says oversold, sells once it recovers past 50.',
    params: [
      { k: 'n', label: 'Period', v: 14, min: 2, max: 50 },
      { k: 'lo', label: 'Buy below', v: 30, min: 1, max: 50 },
      { k: 'hi', label: 'Short above', v: 70, min: 50, max: 99 },
      { k: 'short', label: 'Allow shorts', type: 'bool', v: false },
    ],
    run: rsiReversion,
  },
  {
    id: 'bb',
    call: 'BANDS',
    name: 'Bollinger Reversion',
    color: '--s5',
    desc: 'Buys a close under the lower band, sells at the middle band.',
    params: [
      { k: 'n', label: 'Period', v: 20, min: 3, max: 59 },
      { k: 'k', label: 'Width σ', v: 2, min: 0.5, max: 4, step: 0.1 },
      { k: 'short', label: 'Short upper band', type: 'bool', v: false },
    ],
    run: bollinger,
  },
];

export function strategy(id: StrategyId): Strategy {
  return STRATS.find((s) => s.id === id)!;
}

export function defaultParams(S: Strategy): Params {
  return Object.fromEntries(S.params.map((p) => [p.k, p.v]));
}
