/* Round debrief: result header and stars, next/retry buttons, the revealed tape, the equity
 * race and the standings table. The backtest lab tab lives in lab.ts. */

import { LEVELS, REGIMES, type Market } from '../engine/market';
import { STRATS } from '../engine/strategies';
import { canPost, finishDailyRun } from '../daily/remote';
import { dailyNo, dayLabel } from '../daily/dates';
import { shareGrid } from '../daily/share';
import { ordinal, pct, signClass } from '../format';
import { playLevel, replay } from '../game/actions';
import { game, isDailyMode, type Round } from '../game/round';
import { STAR_GOALS, playerExposure, scoreRound, type RoundScore } from '../game/scoring';
import { lab, persist, save } from '../game/save';
import { drawEquityChart, drawTapeChart } from '../render/debriefCharts';
import { renderDailyDebrief } from './daily';
import { $, classes, fill, find, h } from './dom';
import { renderLab, resetLab } from './lab';
import { currentScreen, onEnter, showScreen } from './screens';

type Tab = 'race' | 'lab';

const view = {
  score: null as RoundScore | null,
  /** Whose trades the tape chart shows: 'you' or a strategy id. */
  shade: 'you',
  tab: 'race' as Tab,
};

/** Scores the finished round, records stars or the daily run, and shows the debrief. */
export function showDebrief(r: Round): void {
  const score = scoreRound(r, game.bots, lab);
  view.score = score;
  view.shade = 'you';
  if (r.mode === 'season') {
    save.stars[r.lvl!] = Math.max(save.stars[r.lvl!], score.stars);
    persist();
  }
  if (r.mode === 'daily') {
    finishDailyRun({
      day: r.m.day!,
      status: 'done',
      ret: +score.ys.ret.toFixed(5),
      stars: score.stars,
      place: score.place,
      racers: score.total,
      trades: r.nTrades,
      grid: shareGrid(r.eqBars),
    });
  }

  fill($('#debHead'), header(r, score));
  renderActions(r, score);
  const daily = isDailyMode(r.mode);
  $('#dailyDeb').hidden = !daily;
  if (daily) renderDailyDebrief();

  fill(
    $('#shadeSel'),
    h('option', { value: 'you' }, 'You'),
    ...STRATS.map((S) => h('option', { value: S.id }, `${S.call} · ${S.name}`)),
  );
  resetLab();
  showScreen('debrief');
  setTab('race');
  (find('#dNext') || $('#dRetry')).focus({ preventScroll: true });
}

function headline(r: Round, cleared: boolean): string {
  const { mode, lvl } = r;
  if (mode === 'daily') return canPost() ? 'Run posted' : 'Run saved';
  if (mode === 'practice') return 'Practice run';
  if (lvl == null) return 'Tape finished';
  if (!cleared) return 'Not cleared';
  return lvl === LEVELS.length - 1 ? 'Season cleared' : 'Market cleared';
}

function eyebrow(r: Round): string {
  const { m, mode, lvl } = r;
  if (isDailyMode(mode)) return `Daily #${dailyNo(m.day!)} · ${dayLabel(m.day!)}` + (mode === 'practice' ? ' · practice' : '');
  if (lvl == null) return m.name!;
  return `Market ${lvl + 1} · ${LEVELS[lvl].sub}`;
}

/** The regimes the traded part of the tape went through, with their lengths. */
function regimeTape(m: Market): HTMLElement | null {
  if (!m.regimes) return null;
  const traded = m.regimes.filter((span) => span.to >= m.warm - 1);
  return h(
    'div',
    { class: 'tapeline', 'aria-label': 'What the market did' },
    ...traded.map((span) => {
      const R = REGIMES[span.k];
      const days = Math.min(span.to, m.n - 1) - Math.max(span.from, m.warm - 1) + 1;
      const style = `background:color-mix(in oklab, var(${R.tint}) ${Math.round(R.a * 100)}%, var(--panel))`;
      return h('span', { style }, `${R.label} · ${days}d`);
    }),
  );
}

function header(r: Round, s: RoundScore): HTMLElement {
  const winRate = r.closed ? Math.round((r.wins / r.closed) * 100) + '%' : '—';
  const signed = (v: number) => h('b', { class: classes('mono', signClass(v)) }, pct(v));
  return h(
    'div',
    { class: 'deb-head' },
    h('div', { class: 'place' }, ordinal(s.place), h('span', null, `of ${s.total} racers`)),
    h(
      'div',
      { style: 'min-width:0' },
      h('div', { class: 'eyebrow' }, eyebrow(r)),
      h('h2', null, headline(r, s.stars > 0)),
      h(
        'p',
        null,
        'You ',
        signed(s.ys.ret),
        ' · INDEX ',
        signed(s.bhRet),
        ` · ${r.nTrades} trades · ${winRate} winners · best streak ${r.bestStreak} · worst drawdown ${pct(s.ys.dd)}`,
      ),
      regimeTape(r.m),
    ),
    h(
      'div',
      { class: 'stars' },
      ...STAR_GOALS.map((goal, i) => h('div', { class: classes('star', s.got[i] && 'on') }, h('b', null, '★'), goal)),
    ),
  );
}

function renderActions(r: Round, s: RoundScore): void {
  const { mode, lvl } = r;
  const cleared = s.stars > 0;
  const season = mode === 'season';
  const hasNext = season && lvl! < LEVELS.length - 1;
  fill(
    $('#debActions'),
    hasNext && cleared &&
      h('button', { class: 'btn primary', id: 'dNext', type: 'button', onclick: () => playLevel(lvl! + 1) }, `Next: market ${lvl! + 2} →`),
    h(
      'button',
      { class: classes('btn', (!season || !cleared) && 'primary'), id: 'dRetry', type: 'button', onclick: () => replay(r) },
      isDailyMode(mode) ? 'Practice this tape' : 'Replay this tape',
    ),
    hasNext && !cleared && h('span', { class: 'small', style: 'align-self:center' }, `Earn one star to unlock market ${lvl! + 2}.`),
    h('button', { class: 'btn', id: 'dMenu', type: 'button', onclick: () => showScreen('title') }, 'Menu'),
  );
}

function setTab(tab: Tab): void {
  view.tab = tab;
  $('#tabRaceBtn').setAttribute('aria-selected', String(tab === 'race'));
  $('#tabLabBtn').setAttribute('aria-selected', String(tab === 'lab'));
  $('#tabRace').hidden = tab !== 'race';
  $('#tabLab').hidden = tab !== 'lab';
  renderDebrief();
}

interface StandingRow {
  id: string;
  call: string;
  name: string;
  color: string;
  eq: number[];
  ret: number;
  sharpe: number;
  dd: number;
  trades: number;
  exposure: number;
}

function standings(r: Round, s: RoundScore): StandingRow[] {
  const you: StandingRow = {
    id: 'you',
    call: 'YOU',
    name: 'You',
    color: '--accent',
    eq: r.eqBars,
    ...s.ys,
    trades: r.nTrades,
    exposure: playerExposure(r),
  };
  const bots = game.bots
    .filter((b) => lab[b.S.id].on)
    .map((b) => ({ id: b.S.id, call: b.S.call, name: b.S.name, color: b.S.color, eq: b.eq, ...b.st, trades: b.trades, exposure: b.exposure }));
  return [you, ...bots].sort((a, b) => b.ret - a.ret);
}

function standingRow(row: StandingRow): HTMLTableRowElement {
  const who =
    row.id === 'you'
      ? [h('b', null, 'You')]
      : [h('b', null, row.call), ' ', h('span', { class: 'small' }, row.name)];
  return h(
    'tr',
    {
      'data-id': row.id,
      class: view.shade === row.id ? 'on' : '',
      onclick: () => {
        view.shade = row.id;
        renderDebrief();
      },
    },
    h('td', null, h('span', { class: 'sw', style: `background:var(${row.color})` }), ...who),
    h('td', { class: signClass(row.ret) }, pct(row.ret)),
    h('td', null, row.sharpe.toFixed(2)),
    h('td', null, pct(row.dd)),
    h('td', null, row.trades),
    h('td', null, Math.round(row.exposure * 100) + '%'),
  );
}

/** Redraws the active tab; called on tab switches, lab changes and resizes. */
export function renderDebrief(): void {
  const r = game.round;
  const s = view.score;
  if (currentScreen() !== 'debrief' || !r || !s) return;
  if (view.tab === 'lab') {
    renderLab(r, s.bhRet);
    return;
  }
  const rows = standings(r, s);
  $<HTMLSelectElement>('#shadeSel').value = view.shade;
  fill($('#tbody'), ...rows.map(standingRow));

  const shaded = view.shade === 'you' ? null : game.bots.find((b) => b.S.id === view.shade);
  drawTapeChart($<HTMLCanvasElement>('#debPrice'), r.m, shaded ? shaded.pos : r.posBars, shaded ? null : r.trades);
  const highlighted = (id: string) => id === 'you' || id === view.shade;
  drawEquityChart(
    $<HTMLCanvasElement>('#debEq'),
    rows.map((row) => ({ eq: row.eq, color: row.color, bold: highlighted(row.id), dim: !highlighted(row.id) })),
    r.m.n - r.m.warm,
  );
}

export function initDebrief(): void {
  onEnter('debrief', () => ($('#debrief').scrollTop = 0));
  $('#tabRaceBtn').addEventListener('click', () => setTab('race'));
  $('#tabLabBtn').addEventListener('click', () => setTab('lab'));
  $<HTMLSelectElement>('#shadeSel').addEventListener('change', (e) => {
    view.shade = (e.target as HTMLSelectElement).value;
    renderDebrief();
  });
  new ResizeObserver(() => {
    if (currentScreen() === 'debrief') renderDebrief();
  }).observe(document.body);
}

