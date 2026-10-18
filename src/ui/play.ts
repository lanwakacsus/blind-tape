/* The play screen: HUD, race ladder, action pad, countdown, pause overlay and the
 * callouts and floating P&L that react to the tape. Also owns the animation loop. */

import { DAILY, LEVELS } from '../engine/market';
import type { Headline } from '../engine/news';
import { dailyNo } from '../daily/dates';
import { reduceMotion } from '../env';
import { pct, signClass } from '../format';
import { body as diaryBody, randomEntry, stamp } from '../game/diary';
import { dayLabel as isoLabel } from '../game/quotes';
import { OMENS, OMEN_FALLBACK } from '../game/lore';
import { riskReward } from '../game/review';
import { bpmFor, setTempo } from '../game/music';
import { sfx } from '../game/sound';
import { lab, progress, save } from '../game/save';
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
import { $, $$, fill, h, icon, kbd, type Child } from './dom';
import { CHART_PHOTO, credit, photo } from '../game/credits';
import { SRC } from './photos';
import { currentScreen, showScreen } from './screens';

let countdownTimer: ReturnType<typeof setTimeout> | undefined;
let calloutTimer: ReturnType<typeof setTimeout> | undefined;

/* ---------- round lifecycle ---------- */

function roundStarted(r: Round): void {
  clearTimeout(countdownTimer);
  const { m, lvl, mode } = r;
  $('#lvlName').textContent =
    mode === 'archive' ? 'ARCHIVE' : mode === 'proof' ? 'HIDDEN TAPE' : isDailyMode(mode) ? `DAILY #${dailyNo(m.day!)}` : lvl == null ? m.name! : `MARKET ${lvl + 1}`;
  $('#lvlSub').textContent =
    mode === 'archive'
      ? isoLabel(m.day!)
      : mode === 'proof'
      ? 'Your tuned bots have never seen this'
      : mode === 'daily' ? 'Ranked run' : mode === 'practice' ? 'Practice, not ranked' : lvl == null ? 'Your CSV' : `${LEVELS[lvl].ticker} \u00b7 ${LEVELS[lvl].sub}`;
  const shot = photo(CHART_PHOTO[lvl ?? CHART_PHOTO.length - 1]);
  fill(
    $('#chartArt'),
    h('img', { class: 'art shot', src: SRC[shot.id], alt: '' }),
    icon(lvl == null ? 'i-record' : LEVELS[lvl].icon, 'art a1'),
    icon('i-record', 'art a2'),
    icon('i-cross', 'art a3'),
    h('span', { class: 'artcredit' }, credit(shot)),
  );
  setTempo(bpmFor(lvl == null ? 290 : LEVELS[lvl].ms));
  $('#pauseBtn').textContent = 'Pause';
  showScreen('play');
  $('#mline').classList.remove('show');
  $('#overlay').classList.remove('ready');
  buildLadder();
  renderWire(r);
  syncPad();
  showReady(r);
}

/* ---------- news wire ---------- */

const WIRE_LINES = 3;

function renderWire(r: Round): void {
  const day = (item: Headline) => Math.max(0, item.at - (r.m.warm - 1));
  fill(
    $('#wire'),
    ...r.wire.slice(-WIRE_LINES).map((item, i, shown) =>
      h('div', { class: i === shown.length - 1 ? 'new' : '' }, h('b', null, `D${day(item)}`), item.text),
    ),
  );
}

let mlineTimer: ReturnType<typeof setTimeout> | undefined;

/** His remark on what you just did, on the chart for a few seconds. */
function onComment(text: string, stage: number): void {
  const el = $('#mline');
  el.dataset.stage = String(stage);
  fill(el, h('b', null, 'M.'), text);
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(mlineTimer);
  mlineTimer = setTimeout(() => el.classList.remove('show'), 5200);
}

function onHeadline(item: Headline): void {
  const r = game.round;
  if (!r) return;
  renderWire(r);
  if (item.diary) {
    callout(item.text, 'leak');
    sfx.leak();
  } else {
    sfx.headline();
  }
}

/** Registers the play screen as the round's view. `onFinished` runs once the tape is over. */
export function initPlay(onFinished: (r: Round) => void): void {
  setRoundView({
    started: roundStarted,
    positionChanged: syncPad,
    barClosed: updateLadder,
    callout,
    headline: onHeadline,
    comment: onComment,
    shake,
    float: floatText,
    finished: (r) => {
      if (currentScreen() === 'play') onFinished(r);
    },
  });
  requestAnimationFrame(frame);
}

function countdownHint(r: Round): Child[] {
  const brief = r.lvl != null ? LEVELS[r.lvl].brief : r.m.regimes ? DAILY.brief : null;
  const opening = r.wire.at(-1);
  const omen = r.lvl != null ? OMENS[r.lvl] : OMEN_FALLBACK;
  return [
    h('blockquote', { class: 'omen' }, omen.text, h('cite', null, omen.source)),
    r.rule && h('div', { class: 'brief rule' }, h('b', null, 'Rule for this market'), r.rule.text),
    brief && h('div', { class: 'brief' }, h('b', null, 'Briefing'), brief, opening && h('em', null, opening.text)),
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

/** Before the countdown nothing moves, so there is time to set size, stop, target and view. */
function showReady(r: Round): void {
  const overlay = $('#overlay');
  overlay.hidden = false;
  overlay.classList.add('ready');
  const start = h('button', { class: 'btn primary start', type: 'button', onclick: () => beginRound() }, 'Start');
  fill(
    overlay,
    h(
      'div',
      { class: 'ready-card' },
      h('b', { class: 'ready-h' }, 'Get set'),
      ...countdownHint(r),
      h('div', { class: 'small' }, 'Nothing moves until you press Start. Set your size, stop, target and view first.'),
      start,
    ),
  );
  start.focus({ preventScroll: true });
}

/** Starts the countdown. Also bound to Enter. */
export function beginRound(): void {
  const r = game.round;
  if (!r || r.phase !== 'ready' || currentScreen() !== 'play') return;
  r.phase = 'countdown';
  $('#overlay').classList.remove('ready');
  runCountdown(r);
}

function runCountdown(r: Round): void {
  const overlay = $('#overlay');
  overlay.hidden = false;
  let n = 3;
  const step = () => {
    if (currentScreen() !== 'play' || r.phase !== 'countdown') return;
    if (n > 0) {
      fill(overlay, h('div', { class: 'cd' }, n), ...countdownHint(r));
      sfx.count(n);
      n--;
      countdownTimer = setTimeout(step, 700);
    } else {
      fill(overlay, h('div', { class: 'cd go' }, 'GO'));
      sfx.go();
      goLive(r);
      countdownTimer = setTimeout(() => {
        if (r.phase === 'run') overlay.hidden = true;
      }, 420);
    }
  };
  step();
}

/** While the tape is stopped, one of the author's entries is on screen. */
function pausedNote(): HTMLElement {
  const entry = randomEntry(progress());
  return h('blockquote', { class: 'omen' }, diaryBody(entry), h('cite', null, stamp(entry)));
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
      pausedNote(),
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

let dread = -1;

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
  for (const b of $$('.act[data-p]')) b.setAttribute('aria-pressed', String(Number(b.dataset.p) === Math.sign(r?.pos ?? 0)));
  for (const b of $$('[data-ind]')) {
    const key = b.dataset.ind as keyof typeof save.indicators;
    b.setAttribute('aria-pressed', String(save.indicators[key]));
    (b as HTMLButtonElement).disabled = key === 'vol' && r?.m.bars[0]?.v == null;
  }
  for (const b of $$('[data-target]')) b.setAttribute('aria-pressed', String(Number(b.dataset.target) === r?.target));
  $('#rrNote').textContent = r?.stop && r.target ? riskReward(r.stop, r.target) : '';
  for (const b of $$('[data-size]')) {
    b.setAttribute('aria-pressed', String(Number(b.dataset.size) === r?.size));
    (b as HTMLButtonElement).disabled = Number(b.dataset.size) > (r?.rule?.maxSize ?? 1);
  }
  for (const b of $$('[data-stop]')) {
    b.setAttribute('aria-pressed', String(Number(b.dataset.stop) === r?.stop));
    (b as HTMLButtonElement).disabled = !!r?.rule?.stop;
  }
  $('#ffBtn').setAttribute('aria-pressed', String(!!r?.fast));
}

function updateHud(r: Round): void {
  const m = r.m;
  const ret = r.e - 1;
  // The edges of the tape bleed and beat faster the deeper the loss.
  const d = Math.round(Math.min(1, Math.max(0, -ret / 0.12)) * 20) / 20;
  if (d !== dread) {
    dread = d;
    $('#chartwrap').style.setProperty('--dread', String(d));
    $('#chartwrap').classList.toggle('rage', d >= 0.5);
  }
  const pnl = $('#pnl');
  pnl.textContent = pct(ret, 2);
  pnl.className = 'pnl-v ' + signClass(ret);

  const chip = $('#posChip');
  if (r.pos) {
    chip.textContent = `${r.pos > 0 ? 'LONG' : 'SHORT'} ${Math.round(Math.abs(r.pos) * 100)}% ${pct(r.e / r.entryE - 1, 1)}`;
    chip.className = 'chip ' + (r.pos > 0 ? 'long' : 'short');
  } else {
    chip.textContent = 'FLAT';
    chip.className = 'chip';
  }

  const ruleChip = $('#ruleChip');
  const cap = r.rule?.maxTrades;
  ruleChip.hidden = !cap;
  if (cap) ruleChip.textContent = `${Math.max(0, cap - r.nTrades)} of ${cap} trades left`;

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
  return [{ id: 'you', call: 'YOU', color: '--accent' }, ...bots, { id: 'ghost', call: 'M.', color: '--ink' }];
}

/** Current return of a racer at the last closed bar. */
function racerValue(r: Round, id: string): number {
  if (id === 'you') return r.e - 1;
  if (id === 'ghost') return r.ghost.eq[r.bar - (r.m.warm - 1)] - 1;
  const bot = game.bots.find((b) => b.S.id === id)!;
  return bot.eq[r.bar - (r.m.warm - 1)] - 1;
}

function buildLadder(): void {
  fill(
    $('#ladder'),
    ...racers().map((r) =>
      h(
        'li',
        { 'data-id': r.id, class: r.id === 'you' ? 'you' : r.id === 'ghost' ? 'ghost' : '' },
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
      sfx.lead();
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
  calloutTimer = setTimeout(() => (c.hidden = true), kind === 'leak' ? 2800 : 1150);
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

