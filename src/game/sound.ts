/* Synth blips through WebAudio. Silent when muted or when audio is unavailable. */

import { save } from './save';

let audio: AudioContext | null = null;

/** Plays a short tone. `slide` multiplies the pitch over the tone's duration. */
export function beep(freq: number, duration = 0.08, type: OscillatorType = 'square', volume = 0.04, slide = 0): void {
  if (save.muted) return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio = audio || new Ctor();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  } catch {
    // No audio: play on silently.
  }
}
