/* Title screen: season map, play and CSV buttons, new-season reset, daily card. */

import { LEVELS, parseCSV } from '../engine/market';
import { starRow } from '../format';
import { playLevel } from '../game/actions';
import { startRound } from '../game/round';
import { isUnlocked, newSeason, nextLevel, save, totalStars } from '../game/save';
import { startTitleBackground } from '../render/titleBackground';
import { renderDaily } from './daily';
import { $, classes, fill, h } from './dom';
import { currentScreen, onEnter } from './screens';

export function renderTitle(): void {
  const next = nextLevel();
  fill(
    $('#season'),
    ...LEVELS.map((L, i) => {
      const open = isUnlocked(i);
      const stars = save.stars[i];
      return h(
        'button',
        {
          class: classes('node', !open && 'locked', open && i === next && 'next'),
          'data-i': i,
          type: 'button',
          disabled: !open,
          'aria-label': `Market ${i + 1}, ${L.sub}` + (open ? `, ${stars} of 3 stars` : ', locked'),
          onclick: () => playLevel(i),
        },
        h('b', null, i + 1),
        h('span', null, L.sub),
        h('em', null, open ? starRow(stars) : 'Locked'),
      );
    }),
  );
  $('#playBtn').textContent = `Play market ${next + 1}`;
  $('#starTotal').textContent = `★ ${totalStars()} / ${LEVELS.length * 3}`;
  $('#muteBtn').textContent = save.muted ? 'Sound off' : 'Sound on';
  renderDaily();
}

function loadCsv(input: HTMLInputElement): void {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  const err = $('#csvErr');
  reader.onload = () => {
    try {
      err.hidden = true;
      startRound(parseCSV(String(reader.result), file.name), null, 'csv');
    } catch (e) {
      err.hidden = false;
      err.textContent = `Could not load ${file.name}: ${(e as Error).message}`;
    }
    input.value = '';
  };
  reader.readAsText(file);
}

/** Two-click reset so a stray click doesn't wipe the stars. */
function armNewSeason(btn: HTMLButtonElement): void {
  if (btn.dataset.armed) {
    newSeason();
    delete btn.dataset.armed;
    btn.textContent = 'New season';
    renderTitle();
    return;
  }
  btn.dataset.armed = '1';
  btn.textContent = 'Reset stars? Click again';
  setTimeout(() => {
    delete btn.dataset.armed;
    btn.textContent = 'New season';
  }, 3000);
}

export function initTitle(): void {
  onEnter('title', () => {
    renderTitle();
    startTitleBackground($<HTMLCanvasElement>('#bgTape'), () => currentScreen() === 'title');
  });
  $('#playBtn').addEventListener('click', () => playLevel(nextLevel()));
  const seasonBtn = $<HTMLButtonElement>('#seasonBtn');
  seasonBtn.addEventListener('click', () => armNewSeason(seasonBtn));
  const csvIn = $<HTMLInputElement>('#csvIn');
  csvIn.addEventListener('change', () => loadCsv(csvIn));
}
