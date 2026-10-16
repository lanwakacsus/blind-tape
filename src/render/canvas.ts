/* Canvas helpers shared by the live tape, the debrief charts and the title background. */

import type { Bar } from '../engine/market';

export const MONO = '11px "Chivo Mono", ui-monospace, Menlo, monospace';

const colorCache: Record<string, string> = {};

/** Resolves a CSS custom property (e.g. '--up') to its colour, cached. */
export function col(cssVar: string): string {
  return (colorCache[cssVar] ||= getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim());
}

export interface Surface {
  ctx: CanvasRenderingContext2D;
  /** CSS pixel size. */
  w: number;
  h: number;
}

/** Sizes the backing store to the element at device pixel ratio and clears it. */
export function setupCanvas(c: HTMLCanvasElement): Surface {
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

/** "Nice" axis ticks (1, 2, 5 × 10^n steps) covering lo..hi. */
export function ticks(lo: number, hi: number, count: number): { t: number[]; step: number } {
  const raw = (hi - lo) / count || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const e = raw / mag;
  const step = (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
  const t: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) t.push(v);
  return { t, step };
}

/** Formats a price with as many decimals as the tick step needs (max 4). */
export function fmtPx(v: number, step = 1): string {
  return v.toFixed(step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step))));
}

let hatchTile: HTMLCanvasElement | null = null;

/** Diagonal hatching for the not-yet-revealed part of the tape. */
export function hatch(ctx: CanvasRenderingContext2D): CanvasPattern {
  if (!hatchTile) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 10;
    const x = tile.getContext('2d')!;
    x.strokeStyle = col('--line');
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, 10);
    x.lineTo(10, 0);
    x.stroke();
    hatchTile = tile;
  }
  return ctx.createPattern(hatchTile, 'repeat')!;
}

/** Filled trade marker with its tip at (x, y), pointing up or down. */
export function triangle(ctx: CanvasRenderingContext2D, x: number, y: number, up: boolean, size: number): void {
  const dy = up ? size * 1.5 : -size * 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size, y + dy);
  ctx.lineTo(x + size, y + dy);
  ctx.closePath();
  ctx.fill();
}

export interface GridOptions {
  values: number[];
  /** Maps a tick value to its y coordinate. */
  y: (v: number) => number;
  /** Right edge of the plot; labels go just past it. */
  right: number;
  label: (v: number) => string;
  /** Opacity of the grid lines (labels are always opaque). */
  alpha?: number;
  lineWidth?: (v: number) => number;
}

/** Horizontal grid lines with right-hand axis labels. Leaves the context set to the mono
 *  font, middle baseline and left alignment, which the charts rely on afterwards. */
export function drawGrid(ctx: CanvasRenderingContext2D, o: GridOptions): void {
  ctx.font = MONO;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  for (const v of o.values) {
    const y = Math.round(o.y(v)) + 0.5;
    ctx.strokeStyle = col('--line');
    ctx.lineWidth = o.lineWidth ? o.lineWidth(v) : 1;
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(o.right, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col('--muted');
    ctx.fillText(o.label(v), o.right + 8, y);
  }
}

export interface CandleStyle {
  bodyWidth: number;
  /** Minimum body height so doji bars stay visible. */
  minBody: number;
  /** Wick x; defaults to x snapped to the pixel grid. */
  wickX?: number;
}

/** One OHLC candle centred on x, coloured up or down. */
export function drawCandle(
  ctx: CanvasRenderingContext2D,
  Y: (v: number) => number,
  x: number,
  b: Bar,
  style: CandleStyle,
): void {
  const color = col(b.c >= b.o ? '--up' : '--down');
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = 1;
  const wx = style.wickX ?? Math.round(x) + 0.5;
  ctx.beginPath();
  ctx.moveTo(wx, Y(b.h));
  ctx.lineTo(wx, Y(b.l));
  ctx.stroke();
  const top = Y(Math.max(b.o, b.c));
  const bottom = Y(Math.min(b.o, b.c));
  ctx.fillRect(x - style.bodyWidth / 2, top, style.bodyWidth, Math.max(style.minBody, bottom - top));
}

/** Vertical dashed marker between history and the traded part of the tape. */
export function drawDivider(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number): void {
  const px = Math.round(x) + 0.5;
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = col('--muted');
  ctx.beginPath();
  ctx.moveTo(px, top);
  ctx.lineTo(px, bottom);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Y mapping for a price range drawn between top and top + height. */
export function yScale(lo: number, hi: number, top: number, height: number): (v: number) => number {
  return (v) => top + ((hi - v) / (hi - lo)) * height;
}
