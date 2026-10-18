/* A review of the player's trades, and what a trader would say about it. The numbers are the
 * ones working traders use: win rate against payoff, expectancy, profit factor, how far trades
 * went for and against you, and what the fees took. Pure: no DOM. */

import { pct } from '../format';
import type { ClosedTrade } from './round';

export interface Review {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  /** Average result of the winners, and of the losers (negative). */
  avgWin: number;
  avgLoss: number;
  /** Average win divided by average loss, or null with nothing to compare. */
  payoff: number | null;
  /** Average result of a trade. What you can expect per trade if this keeps up. */
  expectancy: number;
  /** Money won divided by money lost. Infinity with no losers, null with no trades. */
  profitFactor: number | null;
  avgBars: number;
  avgBarsWin: number;
  avgBarsLoss: number;
  maxLosingStreak: number;
  fees: number;
  /** How far the winners got at their best, on average. */
  avgWinMfe: number;
  /** Average result in units of risk, over the trades that had a stop-loss. */
  avgR: number | null;
  rTrades: number;
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);

export function review(trades: readonly ClosedTrade[], fees: number): Review {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const grossWin = sum(wins.map((t) => t.pnl));
  const grossLoss = -sum(losses.map((t) => t.pnl));
  const avgWin = mean(wins.map((t) => t.pnl));
  const avgLoss = mean(losses.map((t) => t.pnl));
  let streak = 0;
  let maxLosingStreak = 0;
  for (const t of trades) {
    streak = t.pnl <= 0 ? streak + 1 : 0;
    maxLosingStreak = Math.max(maxLosingStreak, streak);
  }
  const rs = trades.filter((t) => t.r != null).map((t) => t.r as number);
  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    avgWin,
    avgLoss,
    payoff: wins.length && losses.length && avgLoss < 0 ? avgWin / -avgLoss : null,
    expectancy: mean(trades.map((t) => t.pnl)),
    profitFactor: !trades.length ? null : grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null,
    avgBars: mean(trades.map((t) => t.bars)),
    avgBarsWin: mean(wins.map((t) => t.bars)),
    avgBarsLoss: mean(losses.map((t) => t.bars)),
    maxLosingStreak,
    fees,
    avgWinMfe: mean(wins.map((t) => t.mfe)),
    avgR: rs.length ? mean(rs) : null,
    rTrades: rs.length,
  };
}

/** What a trader would say about these numbers: the few things that matter most. */
/** `foreign` are the 1-based positions in the trade list of trades that were not the player's. */
export function reviewNotes(rv: Review, foreign: number[] = []): string[] {
  if (!rv.trades) {
    const none = 'You did not trade, so there is nothing to review. Staying flat is a position, but it teaches you nothing about your trading.';
    return foreign.length ? [`Trade${foreign.length > 1 ? 's' : ''} ${foreign.join(' and ')} ${foreign.length > 1 ? 'were' : 'was'} not made by you.`, none] : [none];
  }
  const notes: string[] = foreign.length ? [`Trade${foreign.length > 1 ? 's' : ''} ${foreign.join(' and ')} ${foreign.length > 1 ? 'were' : 'was'} not made by you.`] : [];

  if (rv.expectancy < 0 && rv.winRate > 0.5 && rv.payoff != null && rv.payoff < 1) {
    notes.push(`You won ${Math.round(rv.winRate * 100)}% of your trades, but your average loss (${pct(rv.avgLoss)}) is bigger than your average win (${pct(rv.avgWin)}). A high win rate does not make money if the losers are bigger. Cut losers sooner, or let winners run.`);
  }
  if (rv.expectancy > 0 && rv.winRate < 0.45 && rv.wins > 0) {
    notes.push(`You were right only ${Math.round(rv.winRate * 100)}% of the time and still made money, because winners (${pct(rv.avgWin)}) outweigh losers (${pct(rv.avgLoss)}). That is how trend following works. Expect long losing streaks; yours was ${rv.maxLosingStreak}.`);
  }
  if (rv.losses >= 2 && rv.wins >= 1 && rv.avgBarsLoss > 1.5 * rv.avgBarsWin) {
    notes.push(`You held losers for ${rv.avgBarsLoss.toFixed(0)} bars on average but winners for only ${rv.avgBarsWin.toFixed(0)}. Traders call this the disposition effect: selling winners early to lock in the feeling, and hanging on to losers hoping they come back.`);
  }
  if (rv.wins >= 2 && rv.avgWinMfe > 0 && rv.avgWin < 0.5 * rv.avgWinMfe) {
    notes.push(`Your winners gave back more than half of their peak: they got to ${pct(rv.avgWinMfe)} at best and you kept ${pct(rv.avgWin)}. A profit target (a resting limit order) or a tighter exit would have kept more.`);
  }
  if (rv.trades >= 10 && rv.fees > 0.02) {
    notes.push(`Fees cost you ${pct(rv.fees)} of your account. Every extra trade has to earn that back before it makes a cent.`);
  }
  if (rv.avgR != null && rv.rTrades >= 3) {
    notes.push(`Your average trade was ${rv.avgR.toFixed(2)}R, where R is the distance to your stop-loss. Over many trades, a positive average R is what an edge looks like.`);
  }

  const lines = notes.slice(0, foreign.length ? 5 : 4);
  if (rv.trades < 5) lines.push('Fewer than 5 trades is too few to say anything about your edge. One lucky or unlucky trade is the whole result.');
  return lines.length ? lines : ['Nothing stands out in these numbers, which is itself a result. The trades are consistent with each other.'];
}

/** Reward against risk for a stop and a target, and the win rate you would need just to break even. */
export function riskReward(stop: number, target: number): string {
  const rr = target / stop;
  return `${rr.toFixed(1)} : 1  \u00b7  you need to win ${Math.round(100 / (1 + rr))}% to break even`;
}
