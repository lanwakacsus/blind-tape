/* The play screen: HUD, race ladder, action pad, countdown, pause overlay and the
 * callouts and floating P&L that react to the tape. Also owns the animation loop. */

import { LEVELS } from '../engine/market';
import { dailyNo } from '../daily/dates';
import { reduceMotion } from '../env';
import { pct, signClass } from '../format';
import { beep } from '../game/sound';
import { lab } from '../game/save';
import {
  advance,
  game,
  goLive,
  isDailyMode,
  pause,
  resume,
  setRoundView,
  stopRound,
  type FxKind,
  type Round,
} from '../game/round';
import { drawLive } from '../render/liveChart';
import { $, $$, fill, h, kbd } from './dom';
import { currentScreen, showScreen } from './screens';

let countdownTimer: ReturnType<typeof setTimeout> | undefined;
let calloutTimer: ReturnType<typeof setTimeout> | undefined;

/* ---------- round lifecycle ---------- */

function roundStarted(r: Round): void {
  clearTimeout(countdownTimer);
  const { m, lvl, mode } = r;
  $('#lvlName').textContent =
    mode === 'proof' ? 'HIDDEN TAPE' : isDailyMode(mode) ? `DAILY #${dailyNo(m.day!)}` : lvl == null ? m.name! : `MARKET ${lvl + 1}`;
  $('#lvlSub').textContent =
    mode === 'proof'
      ? 'Your tuned bots have never seen this'
      : mode === 'daily' ? 'Ranked run' : mode === 'practice' ? 'Practice, not ranked' : lvl == null ? 'Your CSV' : LEVELS[lvl].sub;
  $('#pauseBtn').textContent = 'Pause';
  showScreen('play');
  buildLadder();
  syncPad();
  runCountdown(r);
}

/** Registers the play screen as the round's view. `onFinished` runs once the tape is over. */
export function initPlay(onFinished: (r: Round) => void): void {
  setRoundView({
    started: roundStarted,
    positionChanged: syncPad,
    barClosed: updateLadder,
    callout,
    shake,
    float: floatText,
    finished: (r) => {
      if (currentScreen() === 'play') onFinished(r);
    },
  });
  requestAnimationFrame(frame);
}

function countdownHint(): Node[] {
  return [
    h(
      'div',
      { class: 'cd-hint' },
      h('span', null, kbd('↑'), ' long'),
      h('span', null, kbd('↓'), ' short'),
      h('span', null, kbd('Space'), ' flat'),
      h('span', null, 'hold ', kbd('→'), ' fast-forward'),
    ),
    h('div', { class: 'small' }, 'You can take a position before the bell.'),
  ];
}

function runCountdown(r: Round): void {
  const overlay = $('#overlay');
  overlay.hidden = false;
  let n = 3;
  const step = () => {
    if (currentScreen() !== 'play' || r.phase !== 'countdown') return;
    if (n > 0) {
      fill(overlay, h('div', { class: 'cd' }, n), ...countdownHint());
      beep(440, 0.09);
      n--;
      countdownTimer = setTimeout(step, 700);
    } else {
      fill(overlay, h('div', { class: 'cd go' }, 'GO'));
      beep(880, 0.18);
      goLive(r);
      countdownTimer = setTimeout(() => {
        if (r.phase === 'run') overlay.hidden = true;
      }, 420);
    }
  };
  step();
}

/** Toggles pause. `force` true only pauses, false only resumes. */
export function togglePause(force?: boolean): void {
  const r = game.round;
  if (currentScreen() !== 'play' || !r) return;
  const overlay = $('#overlay');
  if (r.phase === 'run' && force !== false) {
    pause(r);
    overlay.hidden = false;
    const resumeBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => togglePause() }, 'Resume');
    fill(
      overlay,
      h('h3', null, 'Paused'),
      h(
        'div',
        { style: 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center' },
        resumeBtn,
        h('button', { class: 'btn', type: 'button', onclick: quit }, 'Quit to menu'),
      ),
      h(
        'div',
        { class: 'small' },
        'Press ',
        kbd('P'),
        ' to resume',
        r.mode === 'daily' ? '. Quitting a ranked daily run posts a DNF.' : '',
      ),
    );
    resumeBtn.focus();
  } else if (r.phase === 'paused' && force !== true) {
    resume(r);
    overlay.hidden = true;
  }
  $('#pauseBtn').textContent = r.phase === 'paused' ? 'Resume' : 'Pause';
}

export function quit(): void {
  clearTimeout(countdownTimer);
  stopRound();
  showScreen('title');
}

/* ---------- animation loop ---------- */

function frame(now: number): void {
  requestAnimationFrame(frame);
  const r = game.round;
  if (currentScreen() !== 'play' || !r) return;
  advance(r, now);
  drawLive($<HTMLCanvasElement>('#live'), r);
  updateHud(r);
}

/* ---------- HUD ---------- */

export function syncPad(): void {
  const r = game.round;
  for (const b of $$('.act[data-p]')) b.setAttribute('aria-pressed', String(Number(b.dataset.p) === r?.pos));
  $('#ffBtn').setAttribute('aria-pressed', String(!!r?.fast));
}

function updateHud(r: Round): void {
  const m = r.m;
  const ret = r.e - 1;
  const pnl = $('#pnl');
  pnl.textContent = pct(ret, 2);
  pnl.className = 'pnl-v ' + signClass(ret);

  const chip = $('#posChip');
  if (r.pos) {
    chip.textContent = `${r.pos > 0 ? 'LONG' : 'SHORT'} ${pct(r.e / r.entryE - 1, 1)}`;
    chip.className = 'chip ' + (r.pos > 0 ? 'long' : 'short');
  } else {
    chip.textContent = 'FLAT';
    chip.className = 'chip';
  }

  const streak = $('#streakChip');
  streak.hidden = r.streak < 2;
  streak.textContent = `${r.streak}× streak`;

  const playBars = m.n - m.warm;
  const daysDone = r.bar - (m.warm - 1);
  const progress = daysDone + (r.phase === 'run' || r.phase === 'paused' ? r.prog : 0);
  $('#prog').style.width = Math.min(100, (progress / playBars) * 100) + '%';
  $('#dayCount').textContent = `Day ${Math.min(playBars, daysDone)}/${playBars}`;

  const you = document.querySelector<HTMLElement>('#ladder li[data-id="you"] .val');
  if (you) setSignedValue(you, ret);
}

function setSignedValue(el: HTMLElement, v: number): void {
  el.textContent = pct(v);
  el.className = 'val ' + signClass(v);
}

/* ---------- race ladder ---------- */

interface Racer {
  id: string;
  call: string;
  color: string;
}

function racers(): Racer[] {
  const bots = game.bots.filter((b) => lab[b.S.id].on).map((b) => ({ id: b.S.id, call: b.S.call, color: b.S.color }));
  return [{ id: 'you', call: 'YOU', color: '--accent' }, ...bots];
}

/** Current return of a racer at the last closed bar. */
function racerValue(r: Round, id: string): number {
  if (id === 'you') return r.e - 1;
  const bot = game.bots.find((b) => b.S.id === id)!;
  return bot.eq[r.bar - (r.m.warm - 1)] - 1;
}

function buildLadder(): void {
  fill(
    $('#ladder'),
    ...racers().map((r) =>
      h(
        'li',
        { 'data-id': r.id, class: r.id === 'you' ? 'you' : '' },
        h('span', { class: 'rk' }),
        h('span', { class: 'tag', style: `--c:var(${r.color})` }, r.call),
        h('span', { class: 'val' }),
      ),
    ),
  );
  updateLadder();
}

/** Re-sorts the ladder with a FLIP animation and announces lead changes. */
function updateLadder(): void {
  const r = game.round;
  if (!r) return;
  const ol = $('#ladder');
  const items = [...ol.children] as HTMLElement[];
  const before = new Map(items.map((li) => [li, li.getBoundingClientRect()]));
  items.sort((a, b) => racerValue(r, b.dataset.id!) - racerValue(r, a.dataset.id!));
  items.forEach((li, i) => {
    ol.appendChild(li);
    li.querySelector('.rk')!.textContent = String(i + 1);
    setSignedValue(li.querySelector('.val')!, racerValue(r, li.dataset.id!));
  });

  if (!reduceMotion) {
    for (const li of items) {
      const a = before.get(li)!;
      const b = li.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (!dx && !dy) continue;
      li.style.transition = 'none';
      li.style.transform = `translate(${dx}px,${dy}px)`;
      void li.offsetWidth;
      li.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1)';
      li.style.transform = '';
    }
  }

  const top = items[0]?.dataset.id ?? null;
  const playBars = r.m.n - r.m.warm;
  const day = r.bar - (r.m.warm - 1);
  if (r.leader !== null && top !== r.leader && day > 5 && day < playBars) {
    if (top === 'you') {
      callout('YOU TAKE THE LEAD', 'gold');
      beep(988, 0.15, 'triangle', 0.05);
    } else if (r.leader === 'you') {
      callout(`${items[0].querySelector('.tag')!.textContent} PASSES YOU`, 'ink');
    }
  }
  r.leader = top;
}

/* ---------- effects ---------- */

function callout(text: string, kind: FxKind): void {
  const c = $('#callout');
  c.hidden = false;
  c.className = 'callout ' + kind;
  c.textContent = text;
  void c.offsetWidth; // restart the animation
  c.classList.add('show');
  clearTimeout(calloutTimer);
  calloutTimer = setTimeout(() => (c.hidden = true), 1150);
}

function shake(): void {
  if (reduceMotion) return;
  const wrap = $('#chartwrap');
  wrap.classList.remove('shake');
  void wrap.offsetWidth;
  wrap.classList.add('shake');
}

/** Rising P&L text at the live price. */
function floatText(text: string, kind: FxKind): void {
  const r = game.round;
  if (!r?.map) return;
  const wrap = $('#chartwrap');
  const el = h('div', { class: 'float' }, text);
  el.style.color = `var(--${kind})`;
  el.style.left = Math.min(r.map.ax, wrap.clientWidth - 60) + 'px';
  el.style.top = Math.max(30, r.map.Y(r.lastPx)) + 'px';
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

