/* The live round: clock, intrabar price path, position changes and mark-to-market.
 * Screen updates go through a RoundView that the UI registers, so this module has no DOM. */

import { FEE } from '../engine/backtest';
import { DAILY, LEVELS, type Bar, type Market, type Rule } from '../engine/market';
import { runGhost, ghostStage, type Ghost, type GhostStage } from '../engine/ghost';
import type { Indicators } from '../engine/indicators';
import { addLeaks, makeWire, type Headline } from '../engine/news';
import { remark, type Moment } from './commentary';
import { leakLines } from './diary';
import { isLate } from './lore';
import { PHANTOM_BARS, phantomSide, planPhantom } from './phantom';
import { runBots, type BotResult, type TuningSnapshot } from '../engine/research';
import type { Position } from '../engine/strategies';
import { pct } from '../format';
import { lab, progress, save } from './save';
import { sfx } from './sound';

/** Position sizes the player can pick, as a fraction of equity. */
/** Progress at which the call from his mother (note 7) starts coming through in market 4. */
const PHONE_AT = 5;

export const SIZES = [0.25, 0.5, 1] as const;
/** Stop-loss levels: the loss on a trade that closes it. 0 is off. */
export const STOPS = [0, 0.02, 0.05, 0.1] as const;
/** Profit targets: the gain on a trade that closes it. 0 is off. */
export const TARGETS = [0, 0.03, 0.06, 0.1] as const;

/** `ready` is the stretch before the countdown: nothing moves until the player starts it. */
export type Phase = 'idle' | 'ready' | 'countdown' | 'run' | 'paused' | 'over';
export type Mode = 'season' | 'daily' | 'practice' | 'csv' | 'proof' | 'archive';
export type FxKind = 'up' | 'down' | 'gold' | 'ink' | 'leak';

export interface Trade {
  /** Bar the trade happened in (the forming bar). */
  i: number;
  /** How far through that bar, 0–1. */
  q: number;
  px: number;
  from: number;
  to: number;
  /** Closed by the stop-loss, not by the player. */
  stopped?: boolean;
}

/** What a hidden-tape round compares against: the tape the bots were tuned on. */
export interface Proof {
  tuning: TuningSnapshot;
  /** The player's return on that earlier tape. */
  youRet: number;
}

/** A finished trade: how it ended, and how far it went for and against you on the way. */
export interface ClosedTrade {
  dir: 1 | -1;
  /** Size as a fraction of equity. */
  size: number;
  entryBar: number;
  exitBar: number;
  bars: number;
  /** Return on the account while the trade was open, fees included. */
  pnl: number;
  /** Worst and best the trade got, as a return on the account at entry. */
  mae: number;
  mfe: number;
  /** Fees paid on it, as a fraction of the starting account. */
  fees: number;
  /** `unknown`: a trade the player did not make. */
  via: 'market' | 'stop-loss' | 'target' | 'end' | 'unknown';
  /** pnl in units of the risk you set with a stop-loss, if you had one on. */
  r: number | null;
}

export interface Round {
  m: Market;
  /** Season market index, or null for daily and CSV tapes. */
  lvl: number | null;
  mode: Mode;
  /** Set for hidden-tape rounds. */
  proof: Proof | null;
  phase: Phase;
  /** Milliseconds per bar at normal speed. */
  ms: number;
  /** Last closed bar. */
  bar: number;
  /** Progress through the forming bar (bar + 1), 0–1. */
  prog: number;
  fast: boolean;
  /** Signed fraction of equity: 1 is fully long, -0.5 half short. */
  pos: number;
  /** How big the next position is, as a fraction of equity. */
  size: number;
  /** Loss on a trade that closes it, or 0 for no stop. */
  stop: number;
  /** The market's restriction on the player, if any. */
  rule: Rule | null;
  /** Times the stop-loss closed a trade. */
  stops: number;
  /** Close a trade once it has made this much, as a fraction of the account. 0 is off. */
  target: number;
  /** Fees paid, as a fraction of the starting account. */
  fees: number;
  closedTrades: ClosedTrade[];
  /** The open trade: where it began and how far it has gone for and against you. */
  entryBar: number;
  mae: number;
  mfe: number;
  entryStop: number;
  tradeFees: number;
  /** Player equity, starting at 1. */
  e: number;
  lastPx: number;
  /** Player equity at each closed bar, from the start of trading. */
  eqBars: number[];
  /** Player position held from each close, like a strategy's pos[]. */
  posBars: number[];
  trades: Trade[];
  /** Which indicators the player has switched on. Shared with the saved preference. */
  ind: Indicators;
  /** The bar after which a trade you did not make may start, if this round has one. */
  phantomAt: number | null;
  phantomEnd: number | null;
  phantomTarget: number;
  /** The position on the account is the one you did not open. */
  phantomOpen: boolean;
  /** The author's bot, racing alongside. */
  ghost: Ghost;
  /** How far gone the author is; sets how his bot trades and how he talks. */
  stage: GhostStage;
  /** Bar of his last remark, and the drawdowns he has already remarked on. */
  lastSaid: number;
  dd: number[];
  /** Every headline planned for this tape. */
  news: Headline[];
  /** The headlines released so far. */
  wire: Headline[];
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
  headline(item: Headline): void;
  /** One of the author's remarks on what the player just did. */
  comment(text: string, stage: GhostStage): void;
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

export function startRound(m: Market, lvl: number | null, mode: Mode, proof: Proof | null = null): void {
  const ms = isDailyMode(mode) || mode === 'archive' ? DAILY.ms : lvl == null ? 300 : LEVELS[lvl].ms;
  const rule = lvl != null ? LEVELS[lvl].rule ?? null : null;
  const late = isLate(new Date());
  const stage = ghostStage(progress(), late);
  const news = addLeaks(makeWire(m, lvl != null ? LEVELS[lvl].noise : DAILY.noise), m, leakLines(late ? Infinity : progress()), Math.random);
  if (lvl === 3 && progress() >= PHONE_AT) {
    news.push({ at: m.warm - 1 + 88, kind: 'chop', text: 'BAR 88. A PHONE IS RINGING. NOBODY ANSWERS.', followed: false, diary: true });
    news.sort((a, b) => a.at - b.at);
  }
  const r: Round = {
    m,
    lvl,
    mode,
    proof,
    phase: 'ready',
    ms,
    bar: m.warm - 1,
    prog: 0,
    fast: false,
    pos: 0,
    size: Math.min(1, rule?.maxSize ?? 1),
    stop: rule?.stop ?? 0,
    rule,
    stops: 0,
    target: 0,
    fees: 0,
    closedTrades: [],
    entryBar: 0,
    mae: 0,
    mfe: 0,
    entryStop: 0,
    tradeFees: 0,
    e: 1,
    lastPx: m.bars[m.warm - 1].c,
    eqBars: [1],
    posBars: new Array(m.n).fill(0),
    trades: [],
    ind: save.indicators,
    phantomAt: planPhantom(m, stage, progress(), Math.random),
    phantomEnd: null,
    phantomTarget: 0,
    phantomOpen: false,
    ghost: runGhost(m, stage),
    stage,
    lastSaid: -99,
    dd: [],
    news,
    wire: news.filter((n) => n.at < m.warm),
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
  if (r.pos !== 0) {
    const now = r.e / r.entryE - 1;
    if (now < r.mae) r.mae = now;
    if (now > r.mfe) r.mfe = now;
    if (!r.phantomOpen) {
      if (r.stop && now <= -r.stop) stopOut(r);
      else if (r.target && now >= r.target) takeProfit(r);
    }
  }
}

/** The profit target is reached: the trade closes at the current price. */
function takeProfit(r: Round): void {
  const gain = r.e / r.entryE - 1;
  moveTo(r, 0, false, 'target');
  view.callout(`TARGET HIT ${pct(gain)}`, 'gold');
}

/** The author reacts, at most every few bars unless it matters. */
function say(r: Round, moment: Moment, force = false): void {
  if (!force && r.bar - r.lastSaid < 4) return;
  const text = remark(moment, r.stage);
  if (!text) return;
  r.lastSaid = r.bar;
  view.comment(text, r.stage);
}

/** Writes the open trade into the log. */
function logTrade(r: Round, pnl: number, via: ClosedTrade['via']): void {
  r.closedTrades.push({
    dir: Math.sign(r.pos) as 1 | -1,
    size: Math.abs(r.pos),
    entryBar: r.entryBar,
    exitBar: r.bar + 1,
    bars: r.bar + 1 - r.entryBar,
    pnl,
    mae: r.mae,
    mfe: r.mfe,
    fees: r.tradeFees,
    via,
    r: r.entryStop ? pnl / r.entryStop : null,
  });
  r.tradeFees = 0;
}

/** The stop-loss fires: the trade is closed at the current price. */
function stopOut(r: Round): void {
  const loss = r.e / r.entryE - 1;
  r.stops++;
  moveTo(r, 0, true, 'stop-loss');
  view.callout(`STOPPED OUT ${pct(loss)}`, 'down');
  view.shake();
  sfx.stop();
  say(r, { kind: 'stop' }, true);
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

/** The author trades your account for a few bars while you are flat, and gets out again. */
function haunt(r: Round): void {
  if (r.phantomEnd != null) {
    if (r.bar >= r.phantomEnd) {
      if (r.phantomOpen) moveTo(r, 0, false, 'unknown');
      r.phantomOpen = false;
      r.phantomEnd = null;
    }
    return;
  }
  if (r.phantomAt != null && r.bar >= r.phantomAt && r.pos === 0 && r.bar < r.m.n - 2 - PHANTOM_BARS) {
    r.phantomTarget = phantomSide(r.m, r.bar) * r.size;
    r.phantomEnd = r.bar + PHANTOM_BARS;
    r.phantomAt = null;
    moveTo(r, r.phantomTarget, false, 'unknown');
    r.phantomOpen = true;
  }
}

function closeBar(r: Round): void {
  const m = r.m;
  const i = r.bar + 1;
  const b = m.bars[i];
  markTo(r, b.c);
  r.bar = i;
  haunt(r);
  r.eqBars.push(r.e);
  r.posBars[i] = r.pos;
  for (const level of [0.05, 0.1, 0.2]) {
    if (r.e - 1 <= -level && !r.dd.includes(level)) {
      r.dd.push(level);
      say(r, { kind: 'drawdown' });
    }
  }
  if (r.bar >= m.n - 1 && r.pos !== 0) logTrade(r, r.e / r.entryE - 1, 'end');
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
    if (gap > 0) sfx.gapUp();
    else sfx.gapDown();
  } else if (move < -BIG_MOVE) {
    view.callout(`PLUNGE ${pct(move)}`, 'down');
    view.shake();
    sfx.plunge();
  } else if (move > BIG_MOVE) {
    view.callout(`SURGE ${pct(move)}`, 'up');
    sfx.surge();
  }
  for (const item of r.news) {
    if (item.at !== i) continue;
    r.wire.push(item);
    view.headline(item);
  }
  view.barClosed();
}

/** Moves to `target`, paying the fee. A trade is scored when the direction changes or the
 *  position closes; resizing a position in the same direction is not a new trade. */
function moveTo(r: Round, target: number, stopped: boolean, via: ClosedTrade['via'] = 'market'): void {
  const feePaid = r.e * FEE * Math.abs(target - r.pos);
  r.e -= feePaid;
  r.fees += feePaid;
  r.tradeFees += feePaid;
  const turned = Math.sign(target) !== Math.sign(r.pos);
  const was = r.pos;
  const phantom = via === 'unknown';
  let closedPnl: number | null = null;

  if (r.pos !== 0 && turned) {
    const pnl = r.e / r.entryE - 1;
    closedPnl = pnl;
    logTrade(r, pnl, via);
  }
  if (r.pos !== 0 && turned && !phantom) {
    const pnl = closedPnl!;
    r.closed++;
    if (pnl > 0) {
      r.wins++;
      r.streak++;
      r.bestStreak = Math.max(r.bestStreak, r.streak);
      sfx.win(r.streak);
      if (r.streak >= 3) view.callout(`${r.streak} WINS IN A ROW`, 'gold');
    } else {
      r.streak = 0;
      sfx.loss();
    }
    view.float(pct(pnl), pnl > 0 ? 'up' : 'down');
  }

  if (target !== 0 && turned) {
    r.entryE = r.e;
    r.entryPx = r.lastPx;
    r.entryBar = r.bar + 1;
    r.mae = 0;
    r.mfe = 0;
    r.entryStop = r.stop;
    r.tradeFees = feePaid;
    if (r.pos === 0 && !phantom) sfx.enter(target > 0);
  } else if (target === 0 && r.pos === 0 && !phantom) {
    sfx.flat();
  }

  r.trades.push({ i: r.bar + 1, q: r.phase === 'run' ? r.prog : 0, px: r.lastPx, from: r.pos, to: target, stopped });
  if (!phantom) r.nTrades++;
  r.pos = target;
  view.positionChanged();

  if (stopped || phantom) return;
  if (r.nTrades === 1 && isLate(new Date())) say(r, { kind: 'late' }, true);
  if (closedPnl != null && closedPnl > 0.03) say(r, { kind: 'win' });
  else if (closedPnl != null && closedPnl < -0.02) say(r, { kind: 'loss' });
  if (target !== 0 && turned && was === 0) {
    const next = r.m.regimes?.find((s) => (s.k === 'crash' || s.k === 'melt') && s.from >= r.bar + 2 && s.from <= r.bar + 4);
    say(r, { kind: 'enter', side: target > 0 ? 1 : -1, ahead: next ? (next.k as 'crash' | 'melt') : null });
  }
  if (r.nTrades % 8 === 0) say(r, { kind: 'trades', n: r.nTrades });
}

/** Trades now, at the market, unless the trade cap says otherwise. */
function marketTo(r: Round, target: number): void {
  if (target === r.pos) return;
  const cap = r.rule?.maxTrades;
  if (target !== 0 && cap && r.nTrades >= cap) {
    view.callout('NO TRADES LEFT', 'down');
    sfx.denied();
    return;
  }
  const phantom = r.phantomOpen;
  r.phantomOpen = false;
  if (phantom && Math.sign(target) === Math.sign(r.pos)) {
    // Same side as the position you did not open: it becomes yours, at your size.
    r.entryE = r.e;
    r.entryBar = r.bar + 1;
    r.entryPx = r.lastPx;
    r.mae = 0;
    r.mfe = 0;
    r.entryStop = r.stop;
    r.tradeFees = 0;
  }
  moveTo(r, target, false);
}

/** Goes long (1), short (-1) or flat (0) at the chosen size. */
export function setPos(dir: Position): void {
  const r = game.round;
  if (!r || !(r.phase === 'run' || r.phase === 'countdown' || r.phase === 'ready')) return;
  marketTo(r, dir * r.size);
}

/** Picks the size of positions. A position already open is resized. */
export function setSize(size: number): void {
  const r = game.round;
  if (!r || size === r.size || size > (r.rule?.maxSize ?? 1)) return;
  r.size = size;
  if (r.pos !== 0 && (r.phase === 'run' || r.phase === 'countdown' || r.phase === 'ready')) marketTo(r, Math.sign(r.pos) * r.size);
  else view.positionChanged();
}

/** Picks the profit target. */
export function setTarget(target: number): void {
  const r = game.round;
  if (!r || target === r.target) return;
  r.target = target;
  view.positionChanged();
}

/** Picks the stop-loss level, unless the market locks it. */
export function setStop(stop: number): void {
  const r = game.round;
  if (!r || r.rule?.stop || stop === r.stop) return;
  r.stop = stop;
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
  sfx.over();
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
