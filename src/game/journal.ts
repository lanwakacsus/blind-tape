/* The player's journal: one line per finished round, and what the author noticed in the pile of
 * them. He has made every one of these mistakes himself. Pure. */

import { pct } from '../format';
import type { Grade } from './scoring';

export interface JournalEntry {
  ts: number;
  mode: string;
  /** Which market, as the debrief names it. */
  market: string;
  lvl: number | null;
  ret: number;
  bhRet: number;
  dd: number;
  sharpe: number;
  grade: Grade;
  /** Trades opened and closed. */
  trades: number;
  winRate: number;
  expectancy: number;
  profitFactor: number | null;
  /** Fees paid, as a fraction of the starting account. */
  fees: number;
  stops: number;
  /** A stop-loss was on for at least one trade. */
  stopUsed: boolean;
}

/** Most entries kept. */
export const KEEP = 300;

const POINTS: Record<Grade, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);

export interface Lifetime {
  rounds: number;
  profitable: number;
  beatHold: number;
  avgRet: number;
  avgBh: number;
  best: JournalEntry | null;
  worst: JournalEntry | null;
  trades: number;
  /** Over every trade, not every round. */
  winRate: number;
  expectancy: number;
  fees: number;
  stops: number;
  /** Average grade, A = 4 to F = 0. */
  gpa: number;
  byMarket: { market: string; n: number; avgRet: number }[];
}

export function lifetime(entries: readonly JournalEntry[]): Lifetime {
  const trades = sum(entries.map((e) => e.trades));
  const markets = new Map<string, number[]>();
  for (const e of entries) markets.set(e.market, [...(markets.get(e.market) ?? []), e.ret]);
  const sorted = [...entries].sort((a, b) => a.ret - b.ret);
  return {
    rounds: entries.length,
    profitable: entries.filter((e) => e.ret > 0).length,
    beatHold: entries.filter((e) => e.ret > e.bhRet).length,
    avgRet: mean(entries.map((e) => e.ret)),
    avgBh: mean(entries.map((e) => e.bhRet)),
    best: sorted.at(-1) ?? null,
    worst: sorted[0] ?? null,
    trades,
    winRate: trades ? sum(entries.map((e) => e.winRate * e.trades)) / trades : 0,
    expectancy: trades ? sum(entries.map((e) => e.expectancy * e.trades)) / trades : 0,
    fees: sum(entries.map((e) => e.fees)),
    stops: sum(entries.map((e) => e.stops)),
    gpa: mean(entries.map((e) => POINTS[e.grade])),
    byMarket: [...markets].map(([market, rets]) => ({ market, n: rets.length, avgRet: mean(rets) })).sort((a, b) => b.avgRet - a.avgRet),
  };
}

/** Patterns across rounds that a single debrief cannot show. Needs enough rounds to mean anything. */
export function habits(entries: readonly JournalEntry[]): string[] {
  if (entries.length < 5) return ['Play a few more rounds. I cannot tell anything from one. I would like to know how you trade.'];
  const out: string[] = [];
  const lt = lifetime(entries);

  // Trading harder after a bad round.
  const afterLoss: number[] = [];
  const afterWin: number[] = [];
  entries.slice(1).forEach((e, i) => (entries[i].ret < 0 ? afterLoss : afterWin).push(e.trades));
  if (afterLoss.length >= 3 && afterWin.length >= 3 && mean(afterLoss) > 1.3 * mean(afterWin) + 2) {
    out.push(`After a losing round you averaged ${mean(afterLoss).toFixed(0)} trades. After a winning one, ${mean(afterWin).toFixed(0)}. I did that. I did that for forty days. It does not win it back.`);
  }

  // Stops.
  const withStop = entries.filter((e) => e.stopUsed);
  const without = entries.filter((e) => !e.stopUsed);
  if (withStop.length >= 2 && without.length >= 2) {
    const [a, b] = [mean(withStop.map((e) => e.dd)), mean(without.map((e) => e.dd))];
    if (a > b + 0.03) out.push(`The rounds with a stop-loss had a shallower worst drawdown (${pct(a)}) than the rounds without (${pct(b)}). I did not use stops. I have the charts.`);
    else if (mean(withStop.map((e) => e.ret)) < mean(without.map((e) => e.ret)) - 0.03) {
      out.push(`Your rounds with a stop-loss averaged ${pct(mean(withStop.map((e) => e.ret)))} against ${pct(mean(without.map((e) => e.ret)))} without. A stop tighter than the market's ordinary range gets hit by noise. Mine were always too tight.`);
    }
  }

  // Against just holding.
  if (lt.beatHold / lt.rounds < 0.4) {
    out.push(`You beat buy and hold in ${lt.beatHold} of ${lt.rounds} rounds. I never did. Not in four hundred tries.`);
  } else if (lt.beatHold / lt.rounds > 0.6) {
    out.push(`You beat buy and hold in ${lt.beatHold} of ${lt.rounds} rounds. Check it on a hidden tape. I believed my own numbers once.`);
  }

  // Costs.
  if (lt.fees > 0.05) out.push(`Across ${lt.rounds} rounds the fees have taken ${pct(lt.fees)} of a starting account. They take it every time.`);

  const [bestM, worstM] = [lt.byMarket[0], lt.byMarket[lt.byMarket.length - 1]];
  if (lt.byMarket.length >= 2 && bestM.n >= 2 && worstM.n >= 2 && bestM.avgRet - worstM.avgRet > 0.05) {
    out.push(`You do best on ${bestM.market} (${pct(bestM.avgRet)} on average) and worst on ${worstM.market} (${pct(worstM.avgRet)}). I could never get through ${worstM.market}.`);
  }

  return out.slice(0, 4).length ? out.slice(0, 4) : ['Nothing stands out. Your rounds look like each other. Mine did not.'];
}
