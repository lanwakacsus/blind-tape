/* Backtesting and performance statistics. Pure: no DOM. */

import type { Market } from './market';

/** Cost per unit of position change: 0.10%. Flipping long to short pays it twice. */
export const FEE = 0.001;

export interface BacktestResult {
  /** Equity curve, starting at 1 at the close before the first tradable bar. */
  eq: number[];
  trades: number;
  /** Fraction of tradable bars spent in the market. */
  exposure: number;
}

export interface Stats {
  ret: number;
  /** Annualised (252 bars) Sharpe of per-bar returns, zero risk-free rate. */
  sharpe: number;
  /** Max drawdown as a negative fraction (or 0). */
  dd: number;
}

/** Runs a position series over the tradable part of a market.
 *  pos[t] is held from close t to close t+1; fees are charged only when it changes. */
export function backtest(pos: readonly number[], m: Market): BacktestResult {
  const { warm, n, bars } = m;
  let equity = 1;
  let prev = 0;
  let trades = 0;
  let inMarket = 0;
  const eq = [1];
  for (let t = warm - 1; t < n - 1; t++) {
    const p = pos[t] || 0;
    if (p !== prev) {
      trades++;
      equity *= 1 - FEE * Math.abs(p - prev);
      prev = p;
    }
    if (p) inMarket++;
    equity *= 1 + p * (bars[t + 1].c / bars[t].c - 1);
    if (equity < 0) equity = 0;
    eq.push(equity);
  }
  return { eq, trades, exposure: inMarket / (n - warm) };
}

export function stats(eq: readonly number[]): Stats {
  let sum = 0;
  let sumSq = 0;
  let k = 0;
  let peak = eq[0];
  let dd = 0;
  for (let i = 1; i < eq.length; i++) {
    const r = eq[i - 1] > 0 ? eq[i] / eq[i - 1] - 1 : 0;
    sum += r;
    sumSq += r * r;
    k++;
    peak = Math.max(peak, eq[i]);
    dd = Math.min(dd, peak > 0 ? eq[i] / peak - 1 : 0);
  }
  const mean = k ? sum / k : 0;
  const sd = k > 1 ? Math.sqrt(Math.max(0, (sumSq - k * mean * mean) / (k - 1))) : 0;
  return {
    ret: eq[eq.length - 1] - 1,
    sharpe: sd > 1e-12 ? (mean / sd) * Math.sqrt(252) : 0,
    dd,
  };
}
