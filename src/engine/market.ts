/* Synthetic markets and CSV import. Pure: no DOM, no globals beyond Math.
 *
 * The arithmetic in genMarket must stay byte-for-byte compatible with earlier builds:
 * the daily challenge relies on every build producing the same tape for the same date. */

export interface Bar {
  o: number;
  h: number;
  l: number;
  c: number;
  /** Shares traded. Absent on imported tapes that do not carry it. */
  v?: number;
}

export type RegimeKey = 'grind' | 'selloff' | 'chop' | 'melt' | 'crash';

export interface Regime {
  label: string;
  /** Mean log return per bar. */
  mu: number;
  /** Per-bar volatility before clustering and level scaling. */
  vol: number;
  /** Min and max length in bars. */
  len: [number, number];
  /** Base weight when picking the next regime. */
  w: number;
  /** CSS colour variable used in the debrief regime strip. */
  tint: string;
  /** Opacity of that tint. */
  a: number;
}

export interface RegimeSpan {
  k: RegimeKey;
  from: number;
  to: number;
}

export interface MarketOptions {
  warm?: number;
  play?: number;
  volMul?: number;
  crashW?: number;
  chopW?: number;
}

/** A restriction a season market puts on the player. */
export interface Rule {
  /** Most position changes allowed. Going flat is always allowed. */
  maxTrades?: number;
  /** Largest position, as a fraction of equity. */
  maxSize?: number;
  /** A stop-loss that is locked on, as a fraction lost on a trade. */
  stop?: number;
  text: string;
}

export interface Level extends MarketOptions {
  rule?: Rule;
  sub: string;
  /** What the market is about: a ticker and an icon id (see the symbols in index.html). */
  ticker: string;
  icon: string;
  /** One-line read of the session shown before the bell. */
  brief: string;
  /** Share of the news wire that is noise (0–1). Does not affect the price path. */
  noise: number;
  /** Milliseconds per bar at normal speed. */
  ms: number;
}

export interface Market {
  bars: Bar[];
  closes: number[];
  n: number;
  /** Index of the first tradable bar; bars before it are visible history. */
  warm: number;
  seed: number | null;
  regimes: RegimeSpan[] | null;
  opts: MarketOptions;
  csv?: boolean;
  name?: string;
  /** UTC date (YYYY-MM-DD) for daily-challenge markets. */
  day?: string;
}

export const REGIMES: Record<RegimeKey, Regime> = {
  grind: { label: 'Grind up', mu: 0.0012, vol: 0.011, len: [25, 60], w: 3, tint: '--up', a: 0.35 },
  selloff: { label: 'Selloff', mu: -0.0018, vol: 0.019, len: [15, 45], w: 2, tint: '--down', a: 0.35 },
  chop: { label: 'Chop', mu: 0, vol: 0.012, len: [20, 50], w: 3, tint: '--muted', a: 0.28 },
  melt: { label: 'Melt-up', mu: 0.0034, vol: 0.017, len: [10, 30], w: 1, tint: '--up', a: 0.75 },
  crash: { label: 'Crash', mu: -0.01, vol: 0.04, len: [4, 10], w: 0.6, tint: '--down', a: 0.8 },
};

export const LEVELS: Level[] = [
  { sub: 'Easy', ticker: 'GEO', icon: 'i-geobasket', brief: 'GEO, the geobasket resale index. Quiet desks, size 43 only. The wire is mostly honest: when it moves, the tape usually follows.', noise: 0.1, ms: 400, volMul: 0.85, crashW: 0.15, chopW: 2 },
  { sub: 'Normal', ticker: 'RMN', icon: 'i-ramones', brief: 'RMN, ramones low. Momentum desks are in charge and the lows keep selling out. Headlines tend to land just ahead of the trend.', noise: 0.2, ms: 330, volMul: 1, crashW: 0.4, chopW: 2.5 },
  { sub: 'Choppy', ticker: 'KSS', icon: 'i-kiss', brief: 'KSS, kiss boots. Taller than the monitor and just as jumpy. The wire is noisy; chasing every headline gets expensive.', noise: 0.35, rule: { maxTrades: 12, text: 'No more than 12 trades. Every one costs 0.10%.' }, ms: 280, volMul: 1.1, crashW: 0.5, chopW: 6 },
  { sub: 'Crash Test', ticker: 'DRK', icon: 'i-drk', brief: 'DRK, the drkshdw hoodie. Liquidity is thin and everything is black. A scare headline buys you a few bars at best.', noise: 0.3, rule: { stop: 0.05, text: 'A 5% stop is locked on. You cannot turn it off.' }, ms: 240, volMul: 1.2, crashW: 1.4, chopW: 3 },
  { sub: 'Hard', ticker: 'TCT', icon: 'i-tecuatl', brief: 'TCT, tecuatl. Everything is moving and half the wire is rumor. Wear them and trust the tape over the headline.', noise: 0.5, rule: { maxSize: 0.5, maxTrades: 16, text: 'Half size at most, and no more than 16 trades.' }, ms: 200, volMul: 1.35, crashW: 1, chopW: 3 },
];

/** Settings for the daily challenge. Changing these changes everyone's daily tape. */
export const DAILY: Level = { sub: 'Daily tape', ticker: 'CHAOS', icon: 'i-record', brief: 'CHAOS, the record that is not out yet. Same wire for everyone today. Some of it is signal.', noise: 0.3, ms: 290, volMul: 1.1, crashW: 0.7, chopW: 3 };

/** Small fast seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over UTF-16 code units, folded into a positive seed. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2147483000) + 1;
}

export function dailySeed(day: string): number {
  return hashSeed('blindtape:' + day);
}

export function dailyMarket(day: string): Market {
  return { ...genMarket(dailySeed(day), DAILY), day };
}

export function makeMarket(m: Omit<Market, 'n' | 'closes'>): Market {
  return { ...m, n: m.bars.length, closes: m.bars.map((b) => b.c) };
}

export function genMarket(seed: number, o: MarketOptions = {}): Market {
  const warm = o.warm ?? 60;
  const play = o.play ?? 150;
  const volMul = o.volMul ?? 1;
  const rnd = mulberry32(seed);
  const gauss = () => {
    let u = 0;
    while (!u) u = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  };
  const weightOf = (k: RegimeKey) =>
    k === 'crash' ? (o.crashW ?? 0.6) : k === 'chop' ? (o.chopW ?? 3) : REGIMES[k].w;

  const n = warm + play;
  const keys = Object.keys(REGIMES) as RegimeKey[];
  const totalWeight = keys.reduce((s, k) => s + weightOf(k), 0);

  // Lay out the regime schedule first, never repeating the same regime twice in a row.
  const regimes: RegimeSpan[] = [];
  let last: RegimeKey | null = null;
  for (let i = 0; i < n; ) {
    let k: RegimeKey;
    do {
      let r = rnd() * totalWeight;
      k = keys.find((q) => (r -= weightOf(q)) < 0) || 'chop';
    } while (k === last);
    const R = REGIMES[k];
    const len = Math.round(R.len[0] + rnd() * (R.len[1] - R.len[0]));
    regimes.push({ k, from: i, to: Math.min(n - 1, i + len - 1) });
    i += len;
    last = k;
  }

  // Then walk the price: clustered volatility, rare jumps, small overnight gaps.
  const bars: Bar[] = [];
  let close = 40 + rnd() * 160;
  let heat = 1;
  let prevZ = 0;
  let ri = 0;
  for (let t = 0; t < n; t++) {
    while (regimes[ri].to < t) ri++;
    const R = REGIMES[regimes[ri].k];
    heat = 0.85 * heat + 0.15 * (0.7 + 0.6 * Math.abs(prevZ));
    const sig = R.vol * heat * volMul;
    let z = gauss();
    if (rnd() < 0.012) z += (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 2);
    prevZ = z;
    const open = t ? close * (1 + gauss() * sig * 0.2) : close;
    const next = close * Math.exp(R.mu + sig * z);
    const high = Math.max(open, next) * (1 + Math.abs(gauss()) * sig * 0.45);
    const low = Math.min(open, next) * (1 - Math.abs(gauss()) * sig * 0.45);
    bars.push({ o: open, h: high, l: low, c: next });
    close = next;
  }
  addVolume(bars, regimes, seed);
  return makeMarket({ bars, warm, seed, regimes, opts: o });
}

/** How much extra trading each regime draws. */
const CROWD: Record<RegimeKey, number> = { grind: 0.2, selloff: 0.7, chop: 0, melt: 0.9, crash: 2 };

/** Volume rises with the size of the move and the gap, and runs high in a panic. It comes from
 *  its own random stream and is added after the prices, so it can never change them. */
function addVolume(bars: Bar[], regimes: RegimeSpan[], seed: number): void {
  const rnd = mulberry32((seed ^ 0x51ed270b) >>> 0);
  let ri = 0;
  bars.forEach((b, t) => {
    while (regimes[ri].to < t) ri++;
    const prev = t ? bars[t - 1].c : b.o;
    const move = Math.abs(Math.log(b.c / prev)) / 0.012;
    const gap = Math.abs(b.o / prev - 1) / 0.01;
    const u1 = rnd() || 1e-9;
    const noise = Math.exp(0.25 * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rnd()));
    b.v = Math.round(1_000_000 * (0.5 + 0.4 * move + 0.3 * gap + 0.3 * CROWD[regimes[ri].k]) * noise);
  });
}

const CLOSE_NAMES = ['adj close', 'adj_close', 'close', 'price', 'last'];
const MAX_CSV_BARS = 260;
const MIN_CSV_BARS = 100;

/** Parses a price CSV. Accepts OHLC with a header, any column order, newest-first files,
 *  and a bare single column of closes. Throws an Error with a user-facing message. */
export function parseCSV(text: string, fileName?: string): Market {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error('the file has fewer than two lines.');

  const split = (l: string) => l.split(/[,;\t]/).map((s) => s.trim().replace(/^"|"$/g, ''));
  let head = split(lines[0]).map((s) => s.toLowerCase());
  const hasHeader = head.some((h) => isNaN(parseFloat(h)) && !/^\d{4}-/.test(h));
  const rows = (hasHeader ? lines.slice(1) : lines).map(split);
  if (!hasHeader) head = rows[0].map((_, i) => 'c' + i);

  const column = (names: string[]) => head.findIndex((h) => names.some((n) => h === n || h.includes(n)));
  let ci = column(CLOSE_NAMES);
  const oi = column(['open']);
  const hi = column(['high']);
  const li = column(['low']);
  const di = column(['date', 'time']);
  if (ci < 0) {
    // No named close column: use the right-most numeric one.
    for (let j = head.length - 1; j >= 0; j--) {
      if (!isNaN(parseFloat(rows[0][j]))) {
        ci = j;
        break;
      }
    }
  }
  if (ci < 0) throw new Error('no price column found. Name one "close", or use a single column of numbers.');

  const cell = (r: string[], i: number) => Number(r[i]);
  let data = rows
    .map((r) => ({ d: r[di], o: cell(r, oi), h: cell(r, hi), l: cell(r, li), c: cell(r, ci) }))
    .filter((r) => isFinite(r.c) && r.c > 0);

  if (di >= 0 && data.length > 1) {
    const first = Date.parse(data[0].d);
    const lastDate = Date.parse(data[data.length - 1].d);
    if (isFinite(first) && isFinite(lastDate) && first > lastDate) data.reverse();
  }
  data = data.slice(-MAX_CSV_BARS);
  if (data.length < MIN_CSV_BARS) {
    throw new Error(`need at least ${MIN_CSV_BARS} rows of prices; found ${data.length}.`);
  }

  // Missing or bad open/high/low fall back to the previous close and the bar's own extremes.
  const valid = (v: number) => isFinite(v) && v > 0;
  let prev = data[0].c;
  const bars = data.map((r) => {
    const o = valid(r.o) ? r.o : prev;
    const bar = {
      o,
      h: Math.max(valid(r.h) ? r.h : 0, o, r.c),
      l: Math.min(valid(r.l) ? r.l : Infinity, o, r.c),
      c: r.c,
    };
    prev = r.c;
    return bar;
  });

  const name = (fileName || 'CSV').replace(/\.[^.]+$/, '').slice(0, 16).toUpperCase();
  return makeMarket({
    bars,
    warm: 60,
    seed: null,
    regimes: null,
    csv: true,
    name,
    opts: { warm: 60, play: bars.length - 60 },
  });
}
