/* Keyboard, pointer and window events for the play and title screens. */

import { playLevel } from '../game/actions';
import { SIZES, STOPS, TARGETS, game, setFast, setPos, setSize, setStop, setTarget } from '../game/round';
import { isPlaying, toggleMusic } from '../game/music';
import { nextLevel, persist, save } from '../game/save';
import type { Position } from '../engine/strategies';
import { $, $$ } from './dom';
import { beginRound, quit, syncPad, togglePause } from './play';
import { currentScreen, showScreen } from './screens';

/** Screens that are just something to read: Escape goes back to the title. */
const READING: string[] = ['notes', 'claims', 'quotes', 'journal', 'archive', 'page'];

function toggleMute(): void {
  save.muted = !save.muted;
  persist();
  const btn = $('#muteBtn');
  btn.textContent = save.muted ? 'Sound off' : 'Sound on';
  btn.setAttribute('aria-pressed', String(save.muted));
}

let beatStopped = false;

function toggleBeat(): void {
  const on = toggleMusic();
  beatStopped = !on;
  for (const b of $$<HTMLButtonElement>('.musicToggle')) {
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? (b.dataset.on ?? 'Stop') : (b.dataset.off ?? 'Beat');
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const key = e.key.toLowerCase();

  if (currentScreen() === 'title') {
    if (key === 'enter' && tag !== 'BUTTON' && tag !== 'LABEL') playLevel(nextLevel());
    return;
  }
  if (READING.includes(currentScreen())) {
    if (key === 'escape') showScreen('title');
    return;
  }
  if (currentScreen() !== 'play') return;

  const position: Record<string, Position> = { arrowup: 1, l: 1, w: 1, arrowdown: -1, s: -1, ' ': 0, f: 0 };
  if (key in position) {
    e.preventDefault();
    if (!e.repeat) setPos(position[key]);
  } else if (key === 'arrowright') {
    e.preventDefault();
    setFast(true);
  } else if (key === 'p' || key === 'escape') {
    e.preventDefault();
    togglePause();
  } else if (key === '1' || key === '2' || key === '3') {
    setSize(SIZES[Number(key) - 1]);
  } else if (key === 'enter') {
    beginRound();
  } else if (key === 't') {
    const r = game.round;
    if (r) setTarget(TARGETS[(TARGETS.indexOf(r.target as (typeof TARGETS)[number]) + 1) % TARGETS.length]);
  } else if (key === 'm') {
    $('#muteBtn').click();
  } else if (key === 'x') {
    const r = game.round;
    if (r) setStop(STOPS[(STOPS.indexOf(r.stop as (typeof STOPS)[number]) + 1) % STOPS.length]);
  }
}

export function initInput(): void {
  // Act on pointerdown for speed; keyboard activation of the buttons arrives as click.
  for (const b of $$('.act[data-p]')) {
    const p = Number(b.dataset.p) as Position;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setPos(p);
    });
    b.addEventListener('click', (e) => {
      if (e.detail === 0) setPos(p);
    });
  }

  for (const b of $$('[data-size]')) b.addEventListener('click', () => setSize(Number(b.dataset.size)));
  for (const b of $$('[data-stop]')) b.addEventListener('click', () => setStop(Number(b.dataset.stop)));

  for (const b of $$('[data-target]')) b.addEventListener('click', () => setTarget(Number(b.dataset.target)));

  for (const b of $$('[data-ind]')) {
    b.addEventListener('click', () => {
      const key = b.dataset.ind as keyof typeof save.indicators;
      save.indicators[key] = !save.indicators[key];
      persist();
      syncPad();
    });
  }

  const ff = $('#ffBtn');
  ff.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    setFast(true);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) ff.addEventListener(ev, () => setFast(false));

  $('#pauseBtn').addEventListener('click', () => togglePause());
  $('#muteBtn').addEventListener('click', toggleMute);
  for (const b of $$('.musicToggle')) b.addEventListener('click', toggleBeat);
  // Browsers do not allow sound before the first click or key press, so the loop starts then.
  const first = (e: Event) => {
    window.removeEventListener('pointerdown', first);
    window.removeEventListener('keydown', first);
    if (!beatStopped && !isPlaying() && !(e.target as HTMLElement | null)?.closest?.('.musicToggle')) toggleBeat();
  };
  window.addEventListener('pointerdown', first);
  window.addEventListener('keydown', first);
  $('#menuBtn').addEventListener('click', () => {
    if (game.round?.phase === 'run') togglePause(true);
    else quit();
  });

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight') setFast(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.round?.phase === 'run') togglePause(true);
  });
  window.addEventListener('blur', () => setFast(false));
}
