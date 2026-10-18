/* M., the author's own bot, left running. He races the player on every tape. How he trades
 * depends on how far gone the author is: careful at first, then erratic, then he starts to
 * see a few bars ahead, and in the end he knows every bar. Pure: no DOM. */

import { backtest, stats, type BacktestResult, type Stats } from './backtest';
import { mulberry32, type Market } from './market';
import { strategy } from './strategies';

/** 0 careful, 1 erratic, 2 sees ahead, 3 knows. */
export type GhostStage = 0 | 1 | 2 | 3;

/** Progress at which each stage begins. */
export const GHOST_AT = [0, 3, 8, 15] as const;

/** How far along he is. At 3 AM he is always all the way there. */
export function ghostStage(progress: number, late = false): GhostStage {
  if (late) return 3;
  let stage: GhostStage = 0;
  for (let s = 1; s < GHOST_AT.length; s++) if (progress >= GHOST_AT[s]) stage = s as GhostStage;
  return stage;
}

const SIZES = [-1, -0.5, 0, 0.5, 1];

/** Position held from each close to the next. Stages 0 and 1 use only the past; stages 2 and 3
 *  read prices that have not happened yet. */
export function ghostPositions(m: Market, stage: GhostStage): number[] {
  const { closes, n } = m;
  const careful = strategy('sma')
    .run(closes, { fast: 10, slow: 30, short: false }, m.bars)
    .map((p) => p * 0.5);
  const rnd = mulberry32(((m.seed ?? 7) ^ 0x9e3779b1) >>> 0);
  const ahead = (t: number, k: number) => (t + k < n ? closes[t + k] / closes[t] - 1 : 0);
  let wander: number | null = null;

  return careful.map((base, t) => {
    if (stage === 0) return base;
    if (stage === 1) {
      if (rnd() < 0.1) wander = SIZES[Math.floor(rnd() * SIZES.length)];
      else if (rnd() < 0.12) wander = null;
      return wander ?? base;
    }
    if (stage === 2) {
      const f = ahead(t, 3);
      return rnd() < 0.7 && Math.abs(f) > 0.01 ? Math.sign(f) : base;
    }
    const f = ahead(t, 1);
    return Math.abs(f) > 0.004 ? Math.sign(f) : 0;
  });
}

export interface Ghost extends BacktestResult {
  stage: GhostStage;
  pos: number[];
  st: Stats;
}

export function runGhost(m: Market, stage: GhostStage): Ghost {
  const pos = ghostPositions(m, stage);
  const r = backtest(pos, m);
  return { stage, pos, st: stats(r.eq), ...r };
}
