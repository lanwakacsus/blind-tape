/* The trade you did not make. Late in the story, once in a while, a position opens on the
 * player's account while they are flat, runs for a few bars in the direction the tape is about
 * to go, and closes again. Nothing announces it. Pure: no DOM. */

import type { GhostStage } from '../engine/ghost';
import type { Market } from '../engine/market';

/** Progress before it can start. His bot has begun to see ahead by then. */
export const PHANTOM_FROM = 10;
/** Bars it runs for. */
export const PHANTOM_BARS = 4;

/** The bar after which it first looks for a chance, or null if this round has none. Not in the
 *  first stretch of the round, and not so late that it could not finish. */
export function planPhantom(m: Market, stage: GhostStage, progress: number, rnd: () => number): number | null {
  if (stage < 2) return null;
  if (stage < 3 && progress < PHANTOM_FROM) return null;
  if (rnd() > (stage === 3 ? 0.85 : 0.5)) return null;
  const first = m.warm + 25;
  const last = m.n - 14;
  return first + Math.floor(rnd() * (last - first));
}

/** Which way the tape goes over the next few bars. It knows. */
export function phantomSide(m: Market, bar: number): 1 | -1 {
  const ahead = m.closes[Math.min(bar + PHANTOM_BARS, m.n - 1)] / m.closes[bar] - 1;
  return ahead >= 0 ? 1 : -1;
}
