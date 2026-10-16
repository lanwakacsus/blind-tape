/* Higher-level lab tools built on the backtester: running every bot on a tape,
 * the SMA parameter sweep, and the out-of-sample check. Pure: no DOM. */

import { backtest, stats, type BacktestResult, type Stats } from './backtest';
import { genMarket, type Market, type MarketOptions } from './market';
import { STRATS, strategy, type Params, type Position, type Strategy, type StrategyId } from './strategies';

export interface BotSetting {
  on: boolean;
  params: Params;
}
export type LabSettings = Record<StrategyId, BotSetting>;

export interface BotResult extends BacktestResult {
  S: Strategy;
  pos: Position[];
  st: Stats;
}

export function runBot(S: Strategy, m: Market, params: Params): BotResult {
  const pos = S.run(m.closes, params, m.bars);
  const r = backtest(pos, m);
  return { S, pos, ...r, st: stats(r.eq) };
}

export function runBots(m: Market, lab: LabSettings): BotResult[] {
  return STRATS.map((S) => runBot(S, m, lab[S.id].params));
}

export const SWEEP_FAST = [2, 3, 5, 8, 10, 13, 15, 20, 25, 30, 40, 50];
export const SWEEP_SLOW = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 59];

/** Return of the SMA crossover for every fast/slow pair; null where fast >= slow.
 *  Indexed [fastIndex][slowIndex]. */
export function smaSweep(m: Market, allowShort: boolean): (number | null)[][] {
  const S = strategy('sma');
  return SWEEP_FAST.map((fast) =>
    SWEEP_SLOW.map((slow) => {
      if (fast >= slow) return null;
      const pos = S.run(m.closes, { fast, slow, short: allowShort }, m.bars);
      return stats(backtest(pos, m).eq).ret;
    }),
  );
}

export interface OutOfSampleRow {
  S: Strategy;
  median: number;
  mean: number;
  worst: number;
  /** How many markets the bot beat buy & hold on. */
  beat: number;
  medianSharpe: number;
}

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2;
}

/** Runs every enabled bot (plus buy & hold) on `count` fresh synthetic markets with the
 *  same difficulty as `m`. CSV tapes fall back to default synthetic settings. */
export function outOfSample(m: Market, lab: LabSettings, count = 100): OutOfSampleRow[] {
  const opts: MarketOptions = m.csv ? {} : m.opts || {};
  const base = (m.seed || 12345) * 7919 + 13;
  const bots = STRATS.filter((S) => lab[S.id].on || S.id === 'bh');
  const acc = new Map(bots.map((S) => [S.id, { rets: [] as number[], sharpes: [] as number[], beat: 0 }]));

  for (let k = 0; k < count; k++) {
    const mm = genMarket((base + k * 104729) % 2147483647, opts);
    const holdRet = stats(backtest(mm.closes.map(() => 1), mm).eq).ret;
    for (const S of bots) {
      const st = runBot(S, mm, lab[S.id].params).st;
      const a = acc.get(S.id)!;
      a.rets.push(st.ret);
      a.sharpes.push(st.sharpe);
      if (st.ret > holdRet) a.beat++;
    }
  }

  return bots
    .map((S) => {
      const a = acc.get(S.id)!;
      return {
        S,
        median: median(a.rets),
        mean: a.rets.reduce((x, y) => x + y, 0) / count,
        worst: Math.min(...a.rets),
        beat: a.beat,
        medianSharpe: median(a.sharpes),
      };
    })
    .sort((a, b) => b.median - a.median);
}
