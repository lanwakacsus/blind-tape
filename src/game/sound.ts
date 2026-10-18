/* Sound, all synthesised: low and sparse, in a minor key, drenched in reverb. A distorted
 * 808-style sub for weight, glassy bells for good news, hi-hat ticks for small things and slow
 * detuned pads for dread. Silent when muted or when audio is unavailable. */

import { save } from './save';

let ac: AudioContext | null = null;
let bus: GainNode;
let send: GainNode;
const curves = new Map<number, Float32Array>();

function context(): AudioContext | null {
  if (save.muted) return null;
  try {
    if (!ac) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new Ctor();
      build(ac);
    }
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

/** Everything goes through one compressor and a low-pass, with a shared reverb on the side. */
function build(a: AudioContext): void {
  bus = a.createGain();
  bus.gain.value = 0.9;
  send = a.createGain();
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 6500;
  const verb = a.createConvolver();
  const len = Math.floor(a.sampleRate * 2.4);
  const ir = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
  }
  verb.buffer = ir;
  const wet = a.createGain();
  wet.gain.value = 0.5;
  bus.connect(comp);
  send.connect(verb);
  verb.connect(wet);
  wet.connect(comp);
  comp.connect(lp);
  lp.connect(a.destination);
}

function softClip(k: number): Float32Array {
  let c = curves.get(k);
  if (!c) {
    c = new Float32Array(256);
    for (let i = 0; i < 256; i++) c[i] = Math.tanh((k * (i * 2)) / 256 - k);
    curves.set(k, c);
  }
  return c;
}

interface Voice {
  type?: OscillatorType;
  /** Glide to this frequency. */
  to?: number;
  glide?: number;
  vol: number;
  attack?: number;
  /** Reverb send, 0–1. */
  wet?: number;
  lp?: number;
  drive?: number;
  /** A second oscillator this many cents away, for haze. */
  detune?: number;
  delay?: number;
}

function voice(a: AudioContext, freq: number, dur: number, v: Voice): void {
  const t = a.currentTime + (v.delay ?? 0);
  const env = a.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(v.vol, t + (v.attack ?? 0.004));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = v.lp ?? 4000;
  if (v.drive) {
    const shaper = a.createWaveShaper();
    shaper.curve = softClip(v.drive) as Float32Array<ArrayBuffer>;
    filter.connect(shaper);
    shaper.connect(env);
  } else {
    filter.connect(env);
  }

  for (const cents of v.detune ? [0, v.detune] : [0]) {
    const osc = a.createOscillator();
    osc.type = v.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, t + Math.min(dur, v.glide ?? dur));
    osc.detune.value = cents;
    osc.connect(filter);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  env.connect(bus);
  const wet = a.createGain();
  wet.gain.value = v.wet ?? 0.3;
  env.connect(wet);
  wet.connect(send);
}

function noise(a: AudioContext, dur: number, vol: number, type: BiquadFilterType, freq: number, delay = 0, wetAmt = 0.15): void {
  const t = a.currentTime + delay;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  const env = a.createGain();
  env.gain.setValueAtTime(vol, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(env);
  env.connect(bus);
  const wet = a.createGain();
  wet.gain.value = wetAmt;
  env.connect(wet);
  wet.connect(send);
  src.start(t);
}

/** A trap-style tick. */
const tick = (a: AudioContext, vol = 0.04, freq = 7500, delay = 0) => noise(a, 0.035, vol, 'highpass', freq, delay, 0.1);

/** A distorted 808: starts high and drops onto `freq`. */
const sub = (a: AudioContext, freq: number, dur: number, vol: number, delay = 0) =>
  voice(a, freq * 2.2, dur, { to: freq, glide: 0.07, vol, attack: 0.003, lp: 260, drive: 3, wet: 0.08, delay });

/** A cold glass note with an inharmonic overtone. */
function bell(a: AudioContext, freq: number, dur: number, vol: number, delay = 0): void {
  voice(a, freq, dur, { vol, attack: 0.002, wet: 0.6, lp: 9000, delay });
  voice(a, freq * 2.76, dur * 0.6, { vol: vol * 0.35, attack: 0.002, wet: 0.6, lp: 9000, delay });
}

/** A slow, slightly out-of-tune pad. */
const haze = (a: AudioContext, freq: number, dur: number, vol: number, delay = 0, attack = 0.08) =>
  voice(a, freq, dur, { type: 'triangle', vol, attack, detune: 9, wet: 0.55, lp: 900, delay });

const play = (fn: (a: AudioContext) => void) => () => {
  const a = context();
  if (!a) return;
  try {
    fn(a);
  } catch {
    // Audio hiccup: play on silently.
  }
};

/** Pitches in A minor pentatonic, for the bells. */
const BELLS = [523.25, 659.25, 783.99, 880];

export const sfx = {
  /** Countdown ticks 3, 2, 1: a sub that climbs towards the start. */
  count: (n: number) =>
    play((a) => {
      tick(a, 0.05);
      sub(a, [65.4, 55, 49][Math.max(0, Math.min(2, n - 1))] ?? 55, 0.3, 0.16);
    })(),
  go: play((a) => {
    sub(a, 41.2, 0.9, 0.26);
    haze(a, 110, 1.3, 0.05, 0.02, 0.05);
    haze(a, 130.8, 1.3, 0.04, 0.02, 0.05);
    haze(a, 164.8, 1.3, 0.035, 0.02, 0.05);
  }),
  enter: (long: boolean) =>
    play((a) => {
      tick(a, 0.035);
      voice(a, long ? 110 : 147, 0.24, { to: long ? 147 : 98, vol: 0.05, attack: 0.01, lp: 800, wet: 0.35 });
    })(),
  flat: play((a) => tick(a, 0.025)),
  win: (streak: number) =>
    play((a) => {
      tick(a, 0.02);
      bell(a, BELLS[Math.max(0, Math.min(BELLS.length - 1, streak - 1))], 1.4, 0.05);
    })(),
  loss: play((a) => {
    sub(a, 43.65, 0.55, 0.22);
    noise(a, 0.12, 0.04, 'lowpass', 500);
  }),
  stop: play((a) => {
    sub(a, 32.7, 0.8, 0.3);
    noise(a, 0.25, 0.12, 'lowpass', 600);
    tick(a, 0.06);
  }),
  gapUp: play((a) => {
    voice(a, 220, 0.45, { to: 330, vol: 0.04, attack: 0.02, lp: 1200, wet: 0.5 });
    bell(a, 783.99, 0.9, 0.03, 0.05);
  }),
  gapDown: play((a) => {
    voice(a, 220, 0.5, { to: 73, vol: 0.06, attack: 0.02, lp: 700, wet: 0.4 });
    sub(a, 36.7, 0.6, 0.14, 0.05);
  }),
  plunge: play((a) => {
    sub(a, 38.9, 0.5, 0.2);
    noise(a, 0.18, 0.08, 'lowpass', 700);
  }),
  surge: play((a) => {
    bell(a, 880, 1.0, 0.045);
    voice(a, 330, 0.2, { to: 392, vol: 0.03, attack: 0.01, lp: 1500, wet: 0.5 });
  }),
  lead: play((a) => bell(a, 880, 1.2, 0.04)),
  headline: play((a) => tick(a, 0.02, 6000)),
  /** A line from the author breaks into the feed: two notes a semitone apart, beating. */
  leak: play((a) => {
    haze(a, 110, 1.6, 0.06, 0, 0.25);
    haze(a, 116.5, 1.6, 0.035, 0, 0.25);
  }),
  denied: play((a) => {
    tick(a, 0.04, 3000);
    sub(a, 46.2, 0.18, 0.08);
  }),
  over: play((a) => {
    sub(a, 55, 1.2, 0.2);
    haze(a, 110, 2.2, 0.045, 0.02, 0.1);
    haze(a, 130.8, 2.2, 0.04, 0.02, 0.1);
    haze(a, 164.8, 2.2, 0.035, 0.02, 0.1);
  }),
};

/** The same voices, for the looping beat in music.ts. */
export const synth = { context, tick, sub, bell, haze, noise };
