/* Debrief charts: the whole tape with one racer's trades, and the equity race. */

import { REGIMES, type Market } from '../engine/market';
import type { Trade } from '../game/round';
import { col, drawCandle, drawDivider, drawGrid, fmtPx, setupCanvas, ticks, triangle, yScale } from './canvas';

/** Bars of history shown before trading starts. */
const HISTORY_SHOWN = 15;

/** Full tape with position shading. Pass the player's `trades` to mark exact intrabar
 *  fills; otherwise markers are drawn at each change in `pos`. */
export function drawTapeChart(canvas: HTMLCanvasElement, m: Market, pos: readonly number[], trades: Trade[] | null): void {
  const { ctx, w, h } = setupCanvas(canvas);
  if (w < 10) return;
  const start = Math.max(0, m.warm - HISTORY_SHOWN);
  const end = m.n - 1;
  const strip = m.regimes ? 16 : 0;
  const padR = 58;
  const padT = 8;
  const padB = 8 + strip;
  const pw = w - padR;
  const ph = h - padT - padB;
  const sw = pw / (end - start + 1);

  let lo = Infinity;
  let hi = -Infinity;
  for (let i = start; i <= end; i++) {
    lo = Math.min(lo, m.bars[i].l);
    hi = Math.max(hi, m.bars[i].h);
  }
  const pad = (hi - lo) * 0.06;
  lo -= pad;
  hi += pad;
  const X = (i: number) => (i - start + 0.5) * sw;
  const Y = yScale(lo, hi, padT, ph);

  const tk = ticks(lo, hi, 5);
  drawGrid(ctx, { values: tk.t, y: Y, right: pw, label: (v) => fmtPx(v, tk.step), alpha: 0.6 });

  for (let i = m.warm - 1; i < m.n - 1; i++) {
    const p = pos[i];
    if (!p) continue;
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = col(p > 0 ? '--up' : '--down');
    ctx.fillRect(X(i), padT, sw + 0.5, ph);
  }
  ctx.globalAlpha = 1;

  drawDivider(ctx, X(m.warm - 1) + sw / 2, padT, padT + ph);

  const style = { bodyWidth: Math.max(1, Math.min(7, sw * 0.6)), minBody: 1 };
  for (let i = start; i <= end; i++) drawCandle(ctx, Y, X(i), m.bars[i], style);

  const size = Math.max(3, Math.min(5, sw * 0.7));
  if (trades) {
    for (const t of trades) {
      const up = t.to > t.from;
      const x = X(t.i) - sw / 2 + t.q * sw;
      const y = Y(t.px);
      ctx.fillStyle = col(up ? '--up' : '--down');
      triangle(ctx, x, up ? y + 6 : y - 6, up, size);
    }
  } else {
    for (let i = m.warm - 1; i < m.n - 1; i++) {
      const before = i === m.warm - 1 ? 0 : pos[i - 1] || 0;
      const p = pos[i] || 0;
      if (p === before) continue;
      const up = p > before;
      const b = m.bars[i];
      ctx.fillStyle = col(up ? '--up' : '--down');
      triangle(ctx, X(i), up ? Y(b.l) + 6 : Y(b.h) - 6, up, size);
    }
  }

  if (strip) drawRegimeStrip(ctx, m, start, X, sw, padT + ph + 6, strip - 4);
}

/** Coloured band under the chart naming each market regime. */
function drawRegimeStrip(
  ctx: CanvasRenderingContext2D,
  m: Market,
  start: number,
  X: (i: number) => number,
  sw: number,
  y0: number,
  height: number,
): void {
  for (const span of m.regimes ?? []) {
    if (span.to < start) continue;
    const R = REGIMES[span.k];
    const x0 = X(Math.max(span.from, start)) - sw / 2;
    const x1 = X(span.to) + sw / 2;
    ctx.globalAlpha = R.a;
    ctx.fillStyle = col(R.tint);
    ctx.fillRect(x0, y0, x1 - x0 - 1, height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = col('--ink');
    ctx.font = '10px "Chivo Mono", monospace';
    ctx.textAlign = 'left';
    if (x1 - x0 > ctx.measureText(R.label).width + 8) ctx.fillText(R.label, x0 + 4, y0 + height / 2 + 0.5);
  }
}

export interface EquitySeries {
  eq: number[];
  color: string;
  bold: boolean;
  dim: boolean;
}

/** Equity curves of every racer, bold ones drawn last so they sit on top. */
export function drawEquityChart(canvas: HTMLCanvasElement, series: EquitySeries[], totalBars: number): void {
  const { ctx, w, h } = setupCanvas(canvas);
  const padR = 52;
  const padT = 10;
  const padB = 8;
  const pw = w - padR;
  const ph = h - padT - padB;
  if (w < 10) return;

  let lo = 1;
  let hi = 1;
  for (const s of series) {
    for (const v of s.eq) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  const pad = (hi - lo) * 0.08 || 0.02;
  lo -= pad;
  hi += pad;
  const X = (i: number) => (i / totalBars) * pw;
  const Y = yScale(lo, hi, padT, ph);

  // Ticks are in returns (equity - 1); the 0% line is drawn heavier.
  const tk = ticks(lo - 1, hi - 1, 4);
  drawGrid(ctx, {
    values: tk.t,
    y: (v) => Y(v + 1),
    right: pw,
    label: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v * 100)) + '%',
    lineWidth: (v) => (Math.abs(v) < 1e-9 ? 1.5 : 1),
  });

  const ordered = [...series].sort((a, b) => (a.bold ? 1 : 0) - (b.bold ? 1 : 0));
  for (const s of ordered) {
    const color = col(s.color);
    ctx.beginPath();
    s.eq.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
    ctx.strokeStyle = color;
    ctx.lineWidth = s.bold ? 2.5 : 1.25;
    ctx.globalAlpha = s.dim ? 0.4 : 1;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;
    const last = s.eq.length - 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(X(last), Y(s.eq[last]), s.bold ? 4 : 2.5, 0, 7);
    ctx.fill();
  }
  ctx.lineWidth = 1;
}
