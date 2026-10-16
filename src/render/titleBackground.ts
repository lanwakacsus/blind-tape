/* Endless random-walk candles drifting behind the title screen. */

import type { Bar } from '../engine/market';
import { reduceMotion } from '../env';
import { drawCandle, setupCanvas } from './canvas';

const SLOT = 16;
const MS_PER_BAR = 260;
const HISTORY = 260;

let running = false;

/** Starts the animation; it stops itself once `isActive` returns false.
 *  With reduced motion it draws a single still frame. */
export function startTitleBackground(canvas: HTMLCanvasElement, isActive: () => boolean): void {
  if (running) return;
  running = true;

  const bars: Bar[] = [];
  let px = 100;
  const addBar = () => {
    const o = px;
    const c = o * Math.exp((Math.random() - 0.495) * 0.045);
    bars.push({ o, c, h: Math.max(o, c) * (1 + Math.random() * 0.012), l: Math.min(o, c) * (1 - Math.random() * 0.012) });
    px = c;
  };
  for (let i = 0; i < HISTORY; i++) addBar();

  let offset = 0;
  let last = performance.now();
  const frame = (now: number) => {
    if (!isActive()) {
      running = false;
      return;
    }
    if (!reduceMotion) {
      offset += (now - last) / MS_PER_BAR;
      while (offset >= 1) {
        offset -= 1;
        bars.shift();
        addBar();
      }
    }
    last = now;
    draw(canvas, bars, offset);
    if (reduceMotion) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function draw(canvas: HTMLCanvasElement, bars: Bar[], offset: number): void {
  const { ctx, w, h } = setupCanvas(canvas);
  const visible = bars.slice(-(Math.ceil(w / SLOT) + 2));
  let lo = Infinity;
  let hi = -Infinity;
  for (const b of visible) {
    lo = Math.min(lo, b.l);
    hi = Math.max(hi, b.h);
  }
  const Y = (v: number) => h * 0.12 + ((hi - v) / (hi - lo)) * h * 0.76;
  ctx.globalAlpha = 0.22;
  visible.forEach((b, i) => {
    const x = w - (visible.length - i - offset) * SLOT;
    drawCandle(ctx, Y, x, b, { bodyWidth: 10, minBody: 1, wickX: x + 0.5 });
  });
  ctx.globalAlpha = 1;
}
