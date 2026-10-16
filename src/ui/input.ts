/* Keyboard, pointer and window events for the play and title screens. */

import { playLevel } from '../game/actions';
import { game, setFast, setPos } from '../game/round';
import { nextLevel, persist, save } from '../game/save';
import type { Position } from '../engine/strategies';
import { $, $$ } from './dom';
import { quit, togglePause } from './play';
import { currentScreen } from './screens';

function toggleMute(): void {
  save.muted = !save.muted;
  persist();
  const btn = $('#muteBtn');
  btn.textContent = save.muted ? 'Sound off' : 'Sound on';
  btn.setAttribute('aria-pressed', String(save.muted));
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
  } else if (key === 'm') {
    $('#muteBtn').click();
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

  const ff = $('#ffBtn');
  ff.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    setFast(true);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) ff.addEventListener(ev, () => setFast(false));

  $('#pauseBtn').addEventListener('click', () => togglePause());
  $('#menuBtn').addEventListener('click', () => {
    if (game.round?.phase === 'run') togglePause(true);
    else quit();
  });
  $('#muteBtn').addEventListener('click', toggleMute);

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight') setFast(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.round?.phase === 'run') togglePause(true);
  });
  window.addEventListener('blur', () => setFast(false));
}
