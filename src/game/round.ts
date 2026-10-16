/* The live round: clock, intrabar price path, position changes and mark-to-market.
 * Screen updates go through a RoundView that the UI registers, so this module has no DOM. */

import { FEE } from '../engine/backtest';
import { DAILY, LEVELS, type Bar, type Market } from '../engine/market';
import { runBots, type BotResult } from '../engine/research';
import type { Position } from '../engine/strategies';
import { pct } from '../format';
import { lab } from './save';
import { beep } from './sound';

export type Phase = 'idle' | 'countdown' | 'run' | 'paused' | 'over';
export type Mode = 'season' | 'daily' | 'practice' | 'csv';
export type FxKind = 'up' | 'down' | 'gold' | 'ink';

export interface Trade {
  /** Bar the trade happened in (the forming bar). */
  i: number;
  /** How far through that bar, 0–1. */
  q: number;
  px: number;
  from: Position;
  to: Position;
}

export interface Round {
  m: Market;
  /** Season market index, or null for daily and CSV tapes. */
  lvl: number | null;
  mode: Mode;
  phase: Phase;
  /** Milliseconds per bar at normal speed. */
  ms: number;
  /** Last closed bar. */
  bar: number;
  /** Progress through the forming bar (bar + 1), 0–1. */
  prog: number;
  fast: boolean;
  pos: Position;
  /** Player equity, starting at 1. */
  e: number;
  lastPx: number;
  /** Player equity at each closed bar, from the start of trading. */
  eqBars: number[];
  /** Player position held from each close, like a strategy's pos[]. */
  posBars: Position[];
  trades: Trade[];
  entryE: number;
  entryPx: number;
  streak: number;
  bestStreak: number;
  nTrades: number;
  wins: number;
  closed: number;
  /** High and low of the forming bar so far. */
  formHi: number | null;
  formLo: number | null;
  /** Smoothed price range of the live chart. */
  scale: { lo: number; hi: number } | null;
  /** Live chart geometry of the latest frame, for floating text. */
  map: { ax: number; Y: (v: number) => number } | null;
  leader: string | null;
  lastNow: number | null;
}

/** What the round needs from the screen. */
export interface RoundView {
  started(r: Round): void;
  positionChanged(): void;
  barClosed(): void;
  callout(text: string, kind: FxKind): void;
  shake(): void;
  float(text: string, kind: FxKind): void;
  finished(r: Round): void;
}

let view: RoundView;
export function setRoundView(v: RoundView): void {
  view = v;
}

export const game = {
  round: null as Round | null,
  /** Every bot backtested on the current tape with the current lab settings. */
  bots: [] as BotResult[],
};

export const isDailyMode = (mode: Mode) => mode === 'daily' || mode === 'practice';

export function computeBots(m: Market): void {
  game.bots = runBots(m, lab);
}

export function startRound(m: Market, lvl: number | null, mode: Mode): void {
  const ms = isDailyMode(mode) ? DAILY.ms : lvl == null ? 300 : LEVELS[lvl].ms;
  const r: Round = {
    m,
    lvl,
    mode,
    phase: 'countdown',
    ms,
    bar: m.warm - 1,
    prog: 0,
    fast: false,
    pos: 0,
    e: 1,
    lastPx: m.bars[m.warm - 1].c,
    eqBars: [1],
    posBars: new Array(m.n).fill(0),
    trades: [],
    entryE: 1,
    entryPx: 0,
    streak: 0,
    bestStreak: 0,
    nTrades: 0,
    wins: 0,
    closed: 0,
    formHi: null,
    formLo: null,
    scale: null,
    map: null,
    leader: null,
    lastNow: null,
  };
  game.round = r;
  computeBots(m);
  view.started(r);
}

/** Called when the countdown ends. A position taken during the countdown counts from bar one. */
export function goLive(r: Round): void {
  r.phase = 'run';
  r.posBars[r.m.warm - 1] = r.pos;
  r.lastNow = null;
}

/** Deterministic intrabar path for bar i at progress q (0–1): open → first extreme →
 *  second extreme → close, with a little wobble, clamped to the bar's range. */
export function intrabarPrice(b: Bar, i: number, q: number): number {
  const pts = b.c >= b.o ? [b.o, b.l, b.h, b.c] : [b.o, b.h, b.l, b.c];
  const ts = [0, 0.3, 0.72, 1];
  let k = 0;
  while (k < 2 && q > ts[k + 1]) k++;
  const f = (q - ts[k]) / (ts[k + 1] - ts[k]);
  let v = pts[k] + (pts[k + 1] - pts[k]) * f;
  v += Math.sin(q * 37 + i * 1.7) * (b.h - b.l) * 0.06 * Math.sin(Math.PI * q);
  return Math.min(b.h, Math.max(b.l, v));
}

function markTo(r: Round, px: number): void {
  if (r.lastPx > 0) {
    r.e *= 1 + r.pos * (px / r.lastPx - 1);
    if (r.e < 0) r.e = 0;
  }
  r.lastPx = px;
}

/** Advances the clock to `now` (a requestAnimationFrame timestamp). */
export function advance(r: Round, now: number): void {
  const dt = r.lastNow == null ? 16 : Math.min(100, now - r.lastNow);
  r.lastNow = now;
  if (r.phase !== 'run') return;
  r.prog += (dt * (r.fast ? 5 : 1)) / r.ms;
  while (r.prog >= 1 && r.phase === 'run') {
    r.prog -= 1;
    closeBar(r);
  }
  if (r.phase === 'run') {
    const px = intrabarPrice(r.m.bars[r.bar + 1], r.bar + 1, r.prog);
    markTo(r, px);
    r.formHi = Math.max(r.formHi ?? px, px);
    r.formLo = Math.min(r.formLo ?? px, px);
  }
}

const BIG_GAP = 0.025;
const BIG_MOVE = 0.045;

function closeBar(r: Round): void {
  const m = r.m;
  const i = r.bar + 1;
  const b = m.bars[i];
  markTo(r, b.c);
  r.bar = i;
  r.eqBars.push(r.e);
  r.posBars[i] = r.pos;
  if (r.bar >= m.n - 1) {
    r.phase = 'over';
    view.barClosed();
    endRound(r);
    return;
  }
  r.formHi = r.formLo = null;

  const move = b.c / m.bars[i - 1].c - 1;
  const gap = m.bars[i + 1].o / b.c - 1;
  if (Math.abs(gap) > BIG_GAP) {
    view.callout(`GAP ${gap > 0 ? 'UP' : 'DOWN'} ${pct(gap)}`, gap > 0 ? 'up' : 'down');
    if (gap < 0) view.shake();
    beep(gap > 0 ? 520 : 160, 0.2, 'sawtooth', 0.04, gap > 0 ? 1.5 : 0.6);
  } else if (move < -BIG_MOVE) {
    view.callout(`PLUNGE ${pct(move)}`, 'down');
    view.shake();
    beep(140, 0.25, 'sawtooth', 0.04, 0.6);
  } else if (move > BIG_MOVE) {
    view.callout(`SURGE ${pct(move)}`, 'up');
    beep(620, 0.18, 'triangle', 0.05, 1.4);
  }
  view.barClosed();
}

/** Changes the player's position, paying the fee and scoring the closed trade. */
export function setPos(p: Position): void {
  const r = game.round;
  if (!r || !(r.phase === 'run' || r.phase === 'countdown') || p === r.pos) return;
  r.e *= 1 - FEE * Math.abs(p - r.pos);

  if (r.pos !== 0) {
    const pnl = r.e / r.entryE - 1;
    r.closed++;
    if (pnl > 0) {
      r.wins++;
      r.streak++;
      r.bestStreak = Math.max(r.bestStreak, r.streak);
      beep(660 + r.streak * 60, 0.12, 'triangle', 0.06, 1.25);
      if (r.streak >= 3) view.callout(`${r.streak} WINS IN A ROW`, 'gold');
    } else {
      r.streak = 0;
      beep(200, 0.14, 'sawtooth', 0.035, 0.8);
    }
    view.float(pct(pnl), pnl > 0 ? 'up' : 'down');
  }

  if (p !== 0) {
    r.entryE = r.e;
    r.entryPx = r.lastPx;
    if (r.pos === 0) beep(p > 0 ? 520 : 340, 0.07);
  } else if (r.pos === 0) {
    beep(300, 0.05);
  }

  r.trades.push({ i: r.bar + 1, q: r.phase === 'run' ? r.prog : 0, px: r.lastPx, from: r.pos, to: p });
  r.nTrades++;
  r.pos = p;
  view.positionChanged();
}

/** Fast-forward only works while the tape is running. */
export function setFast(on: boolean): void {
  const r = game.round;
  if (!r) return;
  r.fast = on && r.phase === 'run';
  view.positionChanged();
}

function endRound(r: Round): void {
  r.fast = false;
  view.positionChanged();
  beep(523, 0.12, 'triangle', 0.06);
  setTimeout(() => beep(784, 0.2, 'triangle', 0.06), 130);
  view.callout('TAPE OVER', 'ink');
  setTimeout(() => {
    if (game.round === r && r.phase === 'over') view.finished(r);
  }, 1300);
}

export function pause(r: Round): void {
  r.phase = 'paused';
  r.fast = false;
  view.positionChanged();
}

export function resume(r: Round): void {
  r.phase = 'run';
  r.lastNow = null;
}

export function stopRound(): void {
  if (game.round) game.round.phase = 'idle';
}
