import { describe, expect, it } from 'vitest';
import { review, reviewNotes, riskReward } from '../src/game/review';
import type { ClosedTrade } from '../src/game/round';

const trade = (pnl: number, extra: Partial<ClosedTrade> = {}): ClosedTrade => ({ dir: 1, size: 1, entryBar: 0, exitBar: 5, bars: 5, pnl, mae: Math.min(0, pnl), mfe: Math.max(0, pnl), fees: 0.001, via: 'market', r: null, ...extra });

describe('review', () => {
  const trades = [trade(0.04), trade(-0.02), trade(0.02), trade(-0.02), trade(-0.02)];
  const rv = review(trades, 0.005);

  it('counts wins, losses and the win rate', () => {
    expect([rv.trades, rv.wins, rv.losses, rv.winRate]).toEqual([5, 2, 3, 0.4]);
  });

  it('works out payoff, expectancy and profit factor the way traders do', () => {
    expect(rv.avgWin).toBeCloseTo(0.03, 12);
    expect(rv.avgLoss).toBeCloseTo(-0.02, 12);
    expect(rv.payoff).toBeCloseTo(1.5, 12);
    expect(rv.expectancy).toBeCloseTo(0, 12);
    expect(rv.profitFactor).toBeCloseTo(0.06 / 0.06, 12);
  });

  it('finds the longest run of losers', () => {
    expect(rv.maxLosingStreak).toBe(2);
    expect(review([trade(-0.01), trade(-0.01), trade(-0.01), trade(0.02)], 0).maxLosingStreak).toBe(3);
  });

  it('copes with no trades, no losers and no winners', () => {
    expect(review([], 0).profitFactor).toBeNull();
    expect(review([trade(0.01)], 0).profitFactor).toBe(Infinity);
    expect(review([trade(-0.01)], 0).payoff).toBeNull();
    expect(review([], 0).expectancy).toBe(0);
  });

  it('averages R only over trades that had a stop', () => {
    const r = review([trade(0.05, { r: 1 }), trade(-0.05, { r: -1 }), trade(0.1, { r: 2 }), trade(0.2)], 0);
    expect(r.rTrades).toBe(3);
    expect(r.avgR).toBeCloseTo(2 / 3, 12);
    expect(review([trade(0.1)], 0).avgR).toBeNull();
  });
});

describe('reviewNotes', () => {
  const say = (trades: ClosedTrade[], fees = 0) => reviewNotes(review(trades, fees)).join(' ');

  it('explains how a high win rate can still lose money', () => {
    const t = [trade(0.01), trade(0.01), trade(0.01), trade(0.01), trade(-0.06)];
    expect(say(t)).toMatch(/won 80% of your trades, but your average loss/);
  });

  it('explains trend following when you are right less often than not', () => {
    const t = [trade(0.1), trade(-0.02), trade(-0.02), trade(-0.02), trade(-0.02)];
    expect(say(t)).toMatch(/right only 20% of the time and still made money/);
    expect(say(t)).toMatch(/yours was 4/);
  });

  it('names the disposition effect', () => {
    const t = [trade(0.02, { bars: 2 }), trade(-0.03, { bars: 12 }), trade(-0.03, { bars: 10 }), trade(0.02, { bars: 2 })];
    expect(say(t)).toMatch(/disposition effect/);
  });

  it('notices winners that gave back their gains', () => {
    const t = [trade(0.01, { mfe: 0.05 }), trade(0.01, { mfe: 0.04 }), trade(-0.02), trade(-0.02), trade(0.0)];
    expect(say(t)).toMatch(/gave back more than half/);
  });

  it('puts a price on the fees, but only when you traded a lot', () => {
    const many = Array.from({ length: 12 }, (_, i) => trade(i % 2 ? 0.01 : -0.01));
    expect(say(many, 0.03)).toMatch(/Fees cost you \+?3\.0%/);
    expect(say(many.slice(0, 4), 0.03)).not.toMatch(/Fees cost/);
  });

  it('warns that a handful of trades proves nothing', () => {
    expect(say([trade(0.05)])).toMatch(/Fewer than 5 trades/);
  });

  it('points out a trade that was not yours, without judging it', () => {
    const own = [trade(0.05), trade(0.05), trade(0.05), trade(0.05), trade(0.05)];
    expect(reviewNotes(review(own, 0), [3])[0]).toBe('Trade 3 was not made by you.');
    expect(reviewNotes(review(own, 0), [2, 4])[0]).toBe('Trades 2 and 4 were not made by you.');
    expect(reviewNotes(review([], 0), [1]).join(' ')).toMatch(/Trade 1 was not made by you\..*nothing to review/);
  });

  it('has something to say when you did not trade', () => {
    expect(say([])).toMatch(/nothing to review/);
  });

  it('never says more than four things about the trades', () => {
    const t = [trade(0.01, { mfe: 0.06, bars: 1, r: 0.5 }), trade(0.01, { mfe: 0.06, bars: 1, r: 0.5 }), trade(-0.08, { bars: 12, r: -1 }), trade(-0.08, { bars: 12, r: -1 }), trade(-0.08, { bars: 12, r: -1 }), trade(0.01, { bars: 1 })];
    expect(reviewNotes(review(t, 0.05)).length).toBeLessThanOrEqual(4);
  });
});

describe('riskReward', () => {
  it('turns a stop and a target into a ratio and the win rate needed to break even', () => {
    expect(riskReward(0.05, 0.1)).toBe('2.0 : 1  \u00b7  you need to win 33% to break even');
    expect(riskReward(0.05, 0.05)).toBe('1.0 : 1  \u00b7  you need to win 50% to break even');
    expect(riskReward(0.02, 0.1)).toContain('5.0 : 1');
  });
});
