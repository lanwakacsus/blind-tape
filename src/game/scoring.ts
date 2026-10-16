/* End-of-round scoring: race placing and the three stars. */

import { stats, type Stats } from '../engine/backtest';
import type { BotResult, LabSettings } from '../engine/research';
import type { Round } from './round';

export const STAR_GOALS = ['Finish in profit', 'Beat INDEX (buy & hold)', 'Finish 1st in the race'];

export interface RoundScore {
  /** The player's stats. */
  ys: Stats;
  /** 1-based finishing place among the player and enabled bots. */
  place: number;
  total: number;
  /** Which of STAR_GOALS were met. */
  got: boolean[];
  stars: number;
  /** Buy & hold return, whether or not INDEX is racing. */
  bhRet: number;
}

export function scoreRound(r: Round, bots: BotResult[], lab: LabSettings): RoundScore {
  const ys = stats(r.eqBars);
  const bhRet = bots.find((b) => b.S.id === 'bh')!.st.ret;
  const field = bots.filter((b) => lab[b.S.id].on);
  const place = field.filter((b) => b.st.ret > ys.ret).length + 1;
  const got = [ys.ret > 0, ys.ret > bhRet, place === 1];
  return { ys, place, total: field.length + 1, got, stars: got.filter(Boolean).length, bhRet };
}

/** Share of tradable bars the player held a position. */
export function playerExposure(r: Round): number {
  const { m } = r;
  return r.posBars.slice(m.warm - 1, m.n - 1).filter(Boolean).length / (m.n - m.warm);
}
