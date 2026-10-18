/* End-of-round scoring: race placing and the three stars. */

import { stats, type Stats } from '../engine/backtest';
import type { BotResult, LabSettings } from '../engine/research';
import type { Round } from './round';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/** Grades the result on risk as well as return: a big win through a deep drawdown does not
 *  earn an A. */
export function riskGrade({ ret, sharpe, dd }: Stats): Grade {
  const calmar = ret / Math.max(0.02, -dd);
  if (ret > 0 && sharpe >= 1 && calmar >= 1.5) return 'A';
  if (ret > 0 && calmar >= 0.75) return 'B';
  if (ret > 0) return 'C';
  return dd > -0.15 ? 'D' : 'F';
}

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
  grade: Grade;
}

export function scoreRound(r: Round, bots: BotResult[], lab: LabSettings): RoundScore {
  const ys = stats(r.eqBars);
  const bhRet = bots.find((b) => b.S.id === 'bh')!.st.ret;
  const field = bots.filter((b) => lab[b.S.id].on);
  const place = field.filter((b) => b.st.ret > ys.ret).length + 1;
  const got = [ys.ret > 0, ys.ret > bhRet, place === 1];
  return { ys, place, total: field.length + 1, got, stars: got.filter(Boolean).length, bhRet, grade: riskGrade(ys) };
}

/** Average size of the position held across the tradable bars (1 is fully invested). */
export function playerExposure(r: Round): number {
  const { m } = r;
  return r.posBars.slice(m.warm - 1, m.n - 1).reduce((sum, p) => sum + Math.abs(p), 0) / (m.n - m.warm);
}
