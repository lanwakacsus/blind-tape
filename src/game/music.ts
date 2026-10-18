/* A looping beat, written for this site and synthesised from the same voices as the sound
 * effects: slow, minor, a distorted 808 under glass bells. It is not any record; the author
 * says so himself. Off until the player starts it. The scheduler only plays what `pattern`
 * returns, so the pattern can be tested without audio. */

import { synth } from './sound';

export type Hit = { kind: 'sub' | 'hat' | 'clap' | 'bell' | 'pad'; freq?: number; vol: number };

/** 16 steps a bar, four bars: E minor, C, D, B. Roots in Hz for the 808. */
const ROOTS = [41.2, 32.7, 36.71, 30.87];
const BELL_NOTES = [
  [659.25, 783.99, 987.77, 783.99],
  [523.25, 659.25, 783.99, 659.25],
  [587.33, 739.99, 880, 739.99],
  [493.88, 622.25, 739.99, 622.25],
];
const PAD = [164.81, 130.81, 146.83, 123.47];
export const STEPS = 64;

/** What sounds on step 0..63 of the loop. */
export function pattern(step: number): Hit[] {
  const bar = Math.floor(step / 16) % 4;
  const s = step % 16;
  const hits: Hit[] = [];
  if (s === 0 || s === 6 || s === 10) hits.push({ kind: 'sub', freq: ROOTS[bar], vol: s === 0 ? 0.3 : 0.2 });
  if (s === 8) hits.push({ kind: 'clap', vol: 0.12 });
  if (s % 2 === 0 || s === 15 || (bar === 3 && s >= 12)) hits.push({ kind: 'hat', vol: s % 4 === 0 ? 0.05 : 0.03 });
  if (s === 0 || s === 3 || s === 7 || s === 11 || s === 13) hits.push({ kind: 'bell', freq: BELL_NOTES[bar][[0, 3, 7, 11, 13].indexOf(s) % 4], vol: 0.035 });
  if (s === 0) hits.push({ kind: 'pad', freq: PAD[bar], vol: 0.03 });
  return hits;
}

/** Beats per minute for a level that moves one bar every `ms` milliseconds: faster markets, faster beat. */
export const bpmFor = (ms: number): number => Math.round(124 + Math.max(0, 400 - ms) * 0.18);

let timer: ReturnType<typeof setInterval> | undefined;
let step = 0;
let nextAt = 0;
let bpm = 130;
let on = false;

export const isPlaying = (): boolean => on;
export const setTempo = (b: number): void => {
  bpm = b;
};

function schedule(): void {
  const a = synth.context();
  if (!a) return;
  if (nextAt < a.currentTime) nextAt = a.currentTime + 0.05;
  const gap = 60 / bpm / 4;
  while (nextAt < a.currentTime + 0.25) {
    const delay = nextAt - a.currentTime;
    try {
      for (const h of pattern(step)) {
        if (h.kind === 'sub') synth.sub(a, h.freq!, 0.55, h.vol, delay);
        else if (h.kind === 'hat') synth.tick(a, h.vol, 8000, delay);
        else if (h.kind === 'clap') synth.noise(a, 0.16, h.vol, 'bandpass', 1900, delay, 0.3);
        else if (h.kind === 'bell') synth.bell(a, h.freq!, 1.2, h.vol, delay);
        else synth.haze(a, h.freq!, gap * 16, h.vol, delay, 0.5);
      }
    } catch {
      // Audio hiccup: keep the loop going.
    }
    step = (step + 1) % STEPS;
    nextAt += gap;
  }
}

/** Starts or stops the loop; returns whether it is now playing. */
export function toggleMusic(): boolean {
  if (on) {
    clearInterval(timer);
    on = false;
    return false;
  }
  on = true;
  step = 0;
  nextAt = 0;
  schedule();
  timer = setInterval(schedule, 80);
  return true;
}
