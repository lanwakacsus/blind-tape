/* The news wire: headlines that hint at the regime schedule of a synthetic tape. Pure: no DOM.
 *
 * Uses its own random stream seeded from the market, so it never touches the price path
 * (the daily challenge needs every build to produce the same tape). Real headlines land a
 * few bars before a regime begins; noise headlines are drawn at random and may or may not
 * be followed by anything. */

import { mulberry32, type Market, type RegimeKey } from './market';

export interface Headline {
  /** Bar whose close releases it. Values below `warm` are shown before the bell. */
  at: number;
  kind: RegimeKey;
  text: string;
  /** A regime of this kind began (or was already running at the open) within the horizon. */
  followed: boolean;
  /** Not news at all: a line from the author's diary that got into the wire. */
  diary?: boolean;
}

/** How many bars after release a headline can still count as followed. */
export const HORIZON = 8;

const POOL: Record<RegimeKey, string[]> = {
  grind: [
    'Pension funds quietly adding exposure',
    'Earnings beats keep trickling in',
    'Volumes thin out as buyers lean in',
    'Dealers report steady two-way demand, tilted up',
  ],
  melt: [
    'Short sellers scramble as the rally broadens',
    'Retail inflows hit a record',
    'Upgrade wave rolls across the sector',
    'Options desks chasing upside into the close',
  ],
  selloff: [
    'Credit spreads widen for a third day',
    'Funds trim risk into weakness',
    'Downgrades pile up on the desk',
    'Bid disappears from the mid-size names',
  ],
  crash: [
    'Margin calls spreading, sources say',
    'Rumor of forced selling at a large fund',
    'Circuit-breaker chatter on the floor',
    'Liquidity vanishes in the last hour',
  ],
  chop: [
    'No catalyst on the calendar',
    'Traders sit on their hands ahead of data',
    'Range holds as volumes dry up',
    'Desks flat, waiting for a reason',
  ],
};

const KINDS = Object.keys(POOL) as RegimeKey[];

export function makeWire(m: Market, noise: number): Headline[] {
  const spans = m.regimes;
  if (!spans) return [];
  const rnd = mulberry32(((m.seed ?? 1) ^ 0x5bd1e995) >>> 0);
  const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
  const last = m.n - 2;

  const kindAt = (t: number) => spans.find((s) => s.from <= t && t <= s.to)?.k;
  const followedBy = (at: number, kind: RegimeKey) => {
    if (kindAt(at + 1) === kind) return true;
    return spans.some((s) => s.k === kind && s.from > at + 1 && s.from <= at + HORIZON);
  };
  const make = (at: number, kind: RegimeKey): Headline => ({ at, kind, text: pick(POOL[kind]), followed: followedBy(at, kind) });

  const out: Headline[] = [];

  // Opening wire: what the desk is saying about the regime already under way.
  const open = kindAt(m.warm);
  if (open && open !== 'chop') out.push(make(m.warm - 1, open));

  // A heads-up a little before each later regime, and a shorter one before crashes.
  for (const s of spans) {
    if (s.from <= m.warm || s.from > last) continue;
    if (s.k === 'chop' && rnd() < 0.5) continue;
    const lead = s.k === 'crash' ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 4);
    out.push(make(Math.max(m.warm, s.from - lead), s.k));
  }

  // Noise: headlines for a regime that is not about to happen.
  const noisy = noise >= 1 ? 0 : Math.round((out.length * noise) / (1 - noise));
  for (let k = 0; k < noisy; k++) {
    const at = m.warm + Math.floor(rnd() * (last - m.warm));
    const next = kindAt(at + 1);
    const kind = pick(KINDS.filter((q) => q !== next));
    out.push(make(at, kind));
  }

  return out.sort((a, b) => a.at - b.at);
}

/** Slips diary lines into the wire at bars away from the opening and the close. They look
 *  like headlines and are never followed by anything. */
export function addLeaks(wire: Headline[], m: Market, lines: readonly string[], rnd: () => number): Headline[] {
  if (!lines.length) return wire;
  const count = Math.min(lines.length, 1 + Math.floor(lines.length / 3));
  const pool = [...lines];
  const taken = new Set<number>();
  const span = Math.max(1, m.n - m.warm - 8);
  const leaks: Headline[] = [];
  // A bounded number of tries, so a stuck random source cannot hold it up.
  for (let tries = 0; tries < count * 20 && leaks.length < count && taken.size < span; tries++) {
    const at = m.warm + 4 + Math.floor(rnd() * span);
    if (taken.has(at) || at > m.n - 2) continue;
    taken.add(at);
    const text = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    leaks.push({ at, kind: 'chop', text, followed: false, diary: true });
  }
  return [...wire, ...leaks].sort((a, b) => a.at - b.at);
}
