/* The live tape: scrolling candles, hatched unknown future, positions, entry line and the
 * pulsing last price. Redrawn every animation frame. */

import { reduceMotion } from '../env';
import { indicatorsFor, type Bands } from '../engine/indicators';
import type { Market } from '../engine/market';
import type { Round } from '../game/round';
import { col, drawCandle, drawDivider, drawGrid, fmtPx, hatch, MONO, setupCanvas, ticks, triangle, yScale } from './canvas';

const PAD_R = 62;
const PAD_B = 12;
/** Fraction of the plot width where the forming bar sits. */
const NOW_AT = 0.8;
/** How quickly the price axis follows the visible range, per frame. */
const SCALE_EASE = 0.12;

export function drawLive(canvas: HTMLCanvasElement, r: Round): void {
  const { ctx, w, h } = setupCanvas(canvas);
  const m = r.m;
  if (w < 10 || h < 10) return;

  const ind = r.ind;
  const set = indicatorsFor(m);
  const padT = Math.min(86, h * 0.22);
  const pw = w - PAD_R;
  const rsiH = ind.rsi ? Math.min(96, h * 0.22) : 0;
  const ph = h - padT - PAD_B - rsiH;
  const slots = Math.max(36, Math.min(100, Math.floor(pw / 10)));
  const sw = pw / slots;
  const ax = pw * NOW_AT;
  const forming = r.phase === 'run' || r.phase === 'paused';
  const f = r.bar + 1;
  const q = forming ? r.prog : 0;
  const X = (i: number) => ax + (i - f + 0.5 - q) * sw;
  const first = Math.max(0, Math.floor(f - ax / sw - 2));

  // Price range of what's visible, eased so the axis doesn't jump.
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = first; i <= r.bar; i++) {
    lo = Math.min(lo, m.bars[i].l);
    hi = Math.max(hi, m.bars[i].h);
  }
  lo = Math.min(lo, r.lastPx);
  hi = Math.max(hi, r.lastPx);
  if (r.pos) {
    lo = Math.min(lo, r.entryPx);
    hi = Math.max(hi, r.entryPx);
  }
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad;
  hi += pad;
  if (!r.scale) r.scale = { lo, hi };
  else {
    r.scale.lo += (lo - r.scale.lo) * SCALE_EASE;
    r.scale.hi += (hi - r.scale.hi) * SCALE_EASE;
  }
  const Y = yScale(r.scale.lo, r.scale.hi, padT, ph);
  r.map = { ax: X(f), Y };

  const tk = ticks(r.scale.lo, r.scale.hi, 5);
  drawGrid(ctx, { values: tk.t, y: Y, right: pw, label: (v) => fmtPx(v, tk.step), alpha: 0.6 });

  // The unknown future.
  const fx = X(f) + sw / 2;
  if (fx < pw) {
    ctx.fillStyle = hatch(ctx);
    ctx.fillRect(fx, 0, pw - fx, h);
    ctx.fillStyle = col('--muted');
    ctx.textAlign = 'center';
    ctx.font = '700 32px "Arial Narrow", Arial, sans-serif';
    ctx.fillText('?', (fx + pw) / 2, padT + ph / 2);
  }

  // Position shading for closed bars, then the bar in progress.
  for (let i = first; i < r.bar; i++) {
    const p = r.posBars[i];
    if (!p) continue;
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = col(p > 0 ? '--up' : '--down');
    ctx.fillRect(X(i), 0, sw + 0.5, h);
  }
  if (r.pos) {
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = col(r.pos > 0 ? '--up' : '--down');
    ctx.fillRect(X(r.bar), 0, X(f) - X(r.bar), h);
  }
  ctx.globalAlpha = 1;

  // History / trading divider.
  const xs = X(m.warm - 1) + sw / 2;
  if (xs > 0 && xs < pw) {
    drawDivider(ctx, xs, padT, h);
    ctx.font = MONO;
    ctx.fillStyle = col('--muted');
    ctx.textAlign = 'right';
    ctx.fillText('history', xs - 6, padT + ph - 6);
    ctx.textAlign = 'left';
    ctx.fillText('trading', xs + 6, padT + ph - 6);
  }

  const style = { bodyWidth: Math.max(2, Math.min(10, sw * 0.62)), minBody: 1.5 };

  // Volume and the price overlays sit under the candles.
  if (ind.vol) drawVolume(ctx, m, first, r.bar, X, style.bodyWidth, padT + ph, ph * 0.2);
  if (ind.bb) drawBands(ctx, set.bb, first, r.bar, X, Y);
  if (ind.ma) {
    drawLine(ctx, set.ma50, first, r.bar, X, Y, col('--muted'), 1.4, [5, 3]);
    drawLine(ctx, set.ma20, first, r.bar, X, Y, col('--ink'), 1.4);
  }

  // Candles, including the one still forming.
  for (let i = first; i <= r.bar; i++) drawCandle(ctx, Y, X(i), m.bars[i], style);
  if (forming) {
    const b = m.bars[f];
    const formingBar = {
      o: b.o,
      h: Math.max(r.formHi ?? r.lastPx, b.o),
      l: Math.min(r.formLo ?? r.lastPx, b.o),
      c: r.lastPx,
    };
    drawCandle(ctx, Y, X(f), formingBar, style);
  }

  // Trade markers.
  for (const t of r.trades) {
    const x = X(t.i) - sw / 2 + t.q * sw;
    if (x < -10) continue;
    const up = t.to > t.from;
    const y = Y(t.px);
    ctx.fillStyle = col(up ? '--up' : '--down');
    triangle(ctx, x, up ? y + 7 : y - 7, up, 5);
  }

  if (ind.rsi) drawRsi(ctx, set.rsi14, first, r.bar, X, pw, padT + ph + 6, rsiH - 8);
  const atr = set.atr14[r.bar];
  if (ind.atr && atr != null) {
    const pct = (100 * atr) / m.closes[r.bar];
    ctx.fillStyle = col('--muted');
    ctx.font = MONO;
    ctx.textAlign = 'right';
    ctx.fillText(`ATR 14  ${pct.toFixed(1)}%   2x = ${(2 * pct).toFixed(1)}%`, pw - 6, padT - 8);
  }

  if (r.pos) drawEntryLine(ctx, r, Y, pw);
  drawLastPrice(ctx, r, Y(r.lastPx), X(forming ? f : r.bar), pw, tk.step);
}

function drawEntryLine(ctx: CanvasRenderingContext2D, r: Round, Y: (v: number) => number, pw: number): void {
  const y = Math.round(Y(r.entryPx)) + 0.5;
  const color = col(r.pos > 0 ? '--up' : '--down');
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(pw, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.fillStyle = color;
  ctx.fillRect(pw + 2, y - 9, PAD_R - 2, 18);
  ctx.fillStyle = col('--bg');
  ctx.font = '700 10px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ENTRY', pw + 7, y);
}

function drawLastPrice(ctx: CanvasRenderingContext2D, r: Round, ly: number, lx: number, pw: number, step: number): void {
  const accent = col('--accent');
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(lx, Math.round(ly) + 0.5);
  ctx.lineTo(pw, Math.round(ly) + 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const pulse = reduceMotion ? 0 : (Math.sin(performance.now() / 180) + 1) / 2;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.25 + 0.2 * pulse;
  ctx.beginPath();
  ctx.arc(lx, ly, 7 + 4 * pulse, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(lx, ly, 3.5, 0, 7);
  ctx.fill();

  ctx.fillRect(pw + 2, ly - 10, PAD_R - 2, 20);
  ctx.fillStyle = col('--accent-ink');
  ctx.font = '700 11px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(fmtPx(r.lastPx, step / 10), pw + 6, ly);
}

type Series = (number | null)[];

function drawLine(ctx: CanvasRenderingContext2D, s: Series, first: number, last: number, X: (i: number) => number, Y: (v: number) => number, color: string, width: number, dash: number[] = []): void {
  ctx.beginPath();
  let pen = false;
  for (let i = first; i <= last; i++) {
    const v = s[i];
    if (v == null) {
      pen = false;
      continue;
    }
    if (pen) ctx.lineTo(X(i), Y(v));
    else ctx.moveTo(X(i), Y(v));
    pen = true;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
}

/** The band between the upper and lower line, shaded, with both edges drawn. */
function drawBands(ctx: CanvasRenderingContext2D, b: Bands, first: number, last: number, X: (i: number) => number, Y: (v: number) => number): void {
  const from = Math.max(first, b.upper.findIndex((v) => v != null));
  if (from < 0 || from > last) return;
  ctx.beginPath();
  for (let i = from; i <= last; i++) (i === from ? ctx.moveTo : ctx.lineTo).call(ctx, X(i), Y(b.upper[i]!));
  for (let i = last; i >= from; i--) ctx.lineTo(X(i), Y(b.lower[i]!));
  ctx.closePath();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = col('--gold');
  ctx.fill();
  ctx.globalAlpha = 0.85;
  drawLine(ctx, b.upper, from, last, X, Y, col('--gold'), 1);
  drawLine(ctx, b.lower, from, last, X, Y, col('--gold'), 1);
  ctx.globalAlpha = 1;
}

function drawVolume(ctx: CanvasRenderingContext2D, m: Market, first: number, last: number, X: (i: number) => number, bodyWidth: number, baseline: number, maxHeight: number): void {
  let vmax = 1;
  for (let i = first; i <= last; i++) vmax = Math.max(vmax, m.bars[i].v ?? 0);
  ctx.globalAlpha = 0.3;
  for (let i = first; i <= last; i++) {
    const b = m.bars[i];
    if (b.v == null) continue;
    const bh = (b.v / vmax) * maxHeight;
    ctx.fillStyle = col(b.c >= b.o ? '--up' : '--down');
    ctx.fillRect(X(i) - bodyWidth / 2, baseline - bh, bodyWidth, bh);
  }
  ctx.globalAlpha = 1;
}

/** RSI in its own strip under the price, with the 30 / 50 / 70 lines. */
function drawRsi(ctx: CanvasRenderingContext2D, s: Series, first: number, last: number, X: (i: number) => number, pw: number, top: number, height: number): void {
  if (height < 24) return;
  const Y = (v: number) => top + (1 - v / 100) * height;
  ctx.lineWidth = 1;
  ctx.strokeStyle = col('--line');
  for (const level of [30, 50, 70]) {
    const y = Math.round(Y(level)) + 0.5;
    ctx.setLineDash(level === 50 ? [2, 4] : []);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(pw, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  drawLine(ctx, s, first, last, X, Y, col('--accent'), 1.5);
  const v = s[last];
  ctx.fillStyle = col('--muted');
  ctx.font = MONO;
  ctx.textAlign = 'left';
  ctx.fillText(`RSI 14  ${v == null ? '-' : v.toFixed(0)}`, 8, top + 11);
  ctx.textAlign = 'right';
  ctx.fillText('70', pw + 28, Y(70));
  ctx.fillText('30', pw + 28, Y(30));
}
