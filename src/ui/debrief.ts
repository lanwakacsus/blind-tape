/* Round debrief: result header and stars, next/retry buttons, the revealed tape, the equity
 * race and the standings table. The backtest lab tab lives in lab.ts. */

import { backtest, stats, type Stats } from '../engine/backtest';
import { LEVELS, REGIMES, type Market } from '../engine/market';
import { HORIZON } from '../engine/news';
import { agreement, tuningCheck } from '../engine/research';
import { STRATS } from '../engine/strategies';
import { canPost, finishDailyRun } from '../daily/remote';
import { dailyNo, dayLabel } from '../daily/dates';
import { shareGrid } from '../daily/share';
import { ordinal, pct, signClass } from '../format';
import { playLevel, replay } from '../game/actions';
import { body, stamp, type Entry } from '../game/diary';
import { verdict } from '../game/lore';
import { dayLabel as isoLabel } from '../game/quotes';
import { review, reviewNotes } from '../game/review';
import { game, isDailyMode, type Round } from '../game/round';
import { STAR_GOALS, playerExposure, scoreRound, type RoundScore } from '../game/scoring';
import { lab, persist, recordJournal, recordRound, save } from '../game/save';
import { drawEquityChart, drawTapeChart } from '../render/debriefCharts';
import { renderDailyDebrief } from './daily';
import { $, classes, fill, find, h } from './dom';
import { renderLab, resetLab } from './lab';
import { currentScreen, onEnter, showScreen } from './screens';

type Tab = 'race' | 'lab';

/** In greyscale the lines need telling apart by pattern, not only by shade. */
const DASHES: Record<string, number[] | undefined> = {
  sma: [10, 3],
  mom: [3, 3],
  don: [10, 3, 2, 3],
  rsi: [1, 4],
  bb: [6, 2],
  ghost: [6, 4],
};

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
  const rv = review(ownTrades(r), r.fees);
  recordJournal({
    ts: Date.now(),
    mode: r.mode,
    market: eyebrow(r),
    lvl: r.lvl,
    ret: score.ys.ret,
    bhRet: score.bhRet,
    dd: score.ys.dd,
    sharpe: score.ys.sharpe,
    grade: score.grade,
    trades: rv.trades,
    winRate: rv.winRate,
    expectancy: rv.expectancy,
    profitFactor: rv.profitFactor != null && Number.isFinite(rv.profitFactor) ? rv.profitFactor : null,
    fees: r.fees,
    stops: r.stops,
    stopUsed: ownTrades(r).some((t) => t.r != null),
  });
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

  renderFound(recordRound());
  fill($('#debHead'), header(r, score));
  renderActions(r, score);
  const daily = isDailyMode(r.mode);
  $('#dailyDeb').hidden = !daily;
  if (daily) renderDailyDebrief();

  fill(
    $('#shadeSel'),
    h('option', { value: 'you' }, 'You'),
    ...STRATS.map((S) => h('option', { value: S.id }, `${S.call} · ${S.name}`)),
    h('option', { value: 'ghost' }, 'M. · left running'),
  );
  resetLab();
  showScreen('debrief');
  setTab('race');
  (find('#dNext') || $('#dRetry')).focus({ preventScroll: true });
}

/** Shows whatever this round brought back from the author's diary. */
function renderFound(found: Entry[]): void {
  $('#loreBox').hidden = found.length === 0;
  if (!found.length) return;
  fill(
    $('#loreBody'),
    ...[...found].reverse().map((e) => h('article', null, h('time', null, stamp(e)), h('p', null, body(e)))),
  );
}

function headline(r: Round, cleared: boolean): string {
  const { mode, lvl } = r;
  if (mode === 'daily') return canPost() ? 'Run posted' : 'Run saved';
  if (mode === 'practice') return 'Practice run';
  if (mode === 'proof') return 'Hidden tape finished';
  if (mode === 'archive') return 'Archived tape finished';
  if (lvl == null) return 'Tape finished';
  if (!cleared) return 'Not cleared';
  return lvl === LEVELS.length - 1 ? 'Season cleared' : 'Market cleared';
}

function eyebrow(r: Round): string {
  const { m, mode, lvl } = r;
  if (mode === 'proof') return 'Tuning check · fresh market';
  if (mode === 'archive') return `Archive · ${isoLabel(m.day!)}`;
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
    { class: classes('deb-head', s.ys.ret < 0 && 'lost') },
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
        ` · ${r.nTrades} trades · ${winRate} winners · best streak ${r.bestStreak} · worst drawdown ${pct(s.ys.dd)}` + (r.stops ? ` · stopped out ${r.stops}×` : ''),
        ' · risk grade ',
        h('b', { class: classes('grade', 'g' + s.grade) }, s.grade),
      ),
      h('p', { class: 'oracle' }, verdict({ ret: s.ys.ret, bhRet: s.bhRet, trades: r.nTrades })),
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
    mode === 'archive' && h('button', { class: 'btn', type: 'button', onclick: () => showScreen('archive') }, 'Back to the archive'),
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
  const ghost: StandingRow = {
    id: 'ghost',
    call: 'M.',
    name: ['left running', 'left running, unwell', 'left running, sees ahead', 'left running, knows'][r.ghost.stage],
    color: '--ink',
    eq: r.ghost.eq,
    ...r.ghost.st,
    trades: r.ghost.trades,
    exposure: r.ghost.exposure,
  };
  return [you, ...bots, ghost].sort((a, b) => b.ret - a.ret);
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

function statsRow(label: string, st: Stats, trades: number, exposure: number): HTMLTableRowElement {
  return h(
    'tr',
    null,
    h('td', null, h('b', null, label)),
    h('td', { class: signClass(st.ret) }, pct(st.ret)),
    h('td', null, st.sharpe.toFixed(2)),
    h('td', null, pct(st.dd)),
    h('td', null, trades),
    h('td', null, Math.round(exposure * 100) + '%'),
  );
}

/** Runs the player's end-of-bar positions through the bots' backtester and finds the bot
 *  they most resembled. */
function renderPlayerReplay(r: Round, s: RoundScore): void {
  const bt = backtest(r.posBars, r.m);
  const st = stats(bt.eq);
  fill($('#replayBody'), statsRow('As played', s.ys, r.nTrades, playerExposure(r)), statsRow('Backtested', st, bt.trades, bt.exposure));

  const field = game.bots.filter((b) => lab[b.S.id].on && b.S.id !== 'bh');
  const note = $('#replayNote');
  if (!field.length) {
    fill(note, 'Backtested: every position change is assumed to happen at the close, as it does for the bots. Any gap to the live result comes from trading inside a bar.');
    return;
  }
  const ranked = field.map((b) => ({ b, same: agreement(r.posBars, b.pos, r.m) })).sort((a, b) => b.same - a.same);
  const twin = ranked[0];
  const best = field.reduce((a, b) => (b.st.ret > a.st.ret ? b : a));
  fill(
    note,
    'Backtested assumes every position change happens at the close, as it does for the bots; the gap to the live result is trading inside a bar. You held the same position as ',
    h('b', null, twin.b.S.call),
    ` on ${Math.round(twin.same * 100)}% of bars (it returned ${pct(twin.b.st.ret)}). `,
    ...(best.st.ret > st.ret
      ? ['A fixed rule did better: ', h('b', null, best.S.call), ` returned ${pct(best.st.ret)} against your ${pct(st.ret)}.`]
      : [`None of the bots beat your backtested ${pct(st.ret)}.`]),
  );
}

const EXITS: Record<string, string> = { market: 'market', target: 'profit target', 'stop-loss': 'stop-loss', end: 'held to the end', unknown: 'unknown' };

/** The trades the player made. A trade the player did not make is listed, but not judged. */
const ownTrades = (r: Round) => r.closedTrades.filter((t) => t.via !== 'unknown');

/** The trades, the numbers working traders look at, and what they say about them. */
function renderReview(r: Round): void {
  const rv = review(ownTrades(r), r.fees);
  const foreign = r.closedTrades.flatMap((t, i) => (t.via === 'unknown' ? [i + 1] : []));
  const tile = (label: string, value: string, hint: string, tone = '') =>
    h('div', { class: 'tile', title: hint }, h('span', null, label), h('b', { class: tone }, value));
  const pf = rv.profitFactor == null ? '\u2014' : Number.isFinite(rv.profitFactor) ? rv.profitFactor.toFixed(2) : '\u221e';
  fill(
    $('#reviewTiles'),
    tile('Trades', String(rv.trades), 'Trades you opened and closed. A trade still open when the tape ended counts as closed there.'),
    tile('Win rate', rv.trades ? Math.round(rv.winRate * 100) + '%' : '\u2014', 'Share of trades that made money. Meaningless on its own: you also need to know how big the wins and losses are.'),
    tile('Average win', rv.wins ? pct(rv.avgWin) : '\u2014', 'What a winning trade made, on average.', signClass(rv.avgWin)),
    tile('Average loss', rv.losses ? pct(rv.avgLoss) : '\u2014', 'What a losing trade lost, on average.', signClass(rv.avgLoss)),
    tile('Payoff ratio', rv.payoff == null ? '\u2014' : rv.payoff.toFixed(2), 'Average win divided by average loss. To break even you need a win rate of 1 / (1 + payoff): at a payoff of 1.5 that is 40%.'),
    tile('Expectancy', rv.trades ? pct(rv.expectancy, 2) : '\u2014', 'The average result of one trade. Positive means that, if this repeated, you would make money per trade.', signClass(rv.expectancy)),
    tile('Profit factor', pf, 'Total won divided by total lost. Above 1 you made money. Around 1.5 or more over many trades is solid.'),
    tile('Fees paid', pct(-r.fees, 2), 'Every trade costs 0.10% (resting limit orders half that). This is the total, as a share of your starting account.', 'down'),
    tile('Average hold', rv.trades ? `${rv.avgBars.toFixed(1)} bars` : '\u2014', 'How long a trade lasted, on average.'),
  );
  fill($('#reviewNotes'), ...reviewNotes(rv, foreign).map((line) => h('li', null, line)));
  fill(
    $('#reviewBody'),
    ...r.closedTrades.map((t, i) =>
      h(
        'tr',
        { style: 'cursor:default', class: t.via === 'unknown' ? 'phantom' : '' },
        h('td', null, i + 1),
        h('td', null, t.dir > 0 ? 'LONG' : 'SHORT'),
        h('td', null, Math.round(t.size * 100) + '%'),
        h('td', null, t.bars + 'd'),
        h('td', { class: signClass(t.pnl) }, pct(t.pnl)),
        h('td', { class: 'down' }, pct(t.mae)),
        h('td', { class: 'up' }, pct(t.mfe)),
        h('td', null, t.r == null ? '\u2014' : t.r.toFixed(2)),
        h('td', null, EXITS[t.via]),
      ),
    ),
  );
}

function renderWireRecap(r: Round): void {
  $('#wireBox').hidden = r.news.length === 0;
  if (!r.news.length) return;
  const real = r.news.filter((n) => !n.diary);
  const hits = real.filter((n) => n.followed).length;
  $('#wireTally').textContent = `${hits} of ${real.length} headlines were followed by the move they hinted at`;
  fill(
    $('#wireBody'),
    ...r.news.map((n) =>
      h(
        'tr',
        { style: 'cursor:default' },
        h('td', null, Math.max(0, n.at - (r.m.warm - 1))),
        h('td', { style: 'white-space:normal;text-align:left;font-family:var(--f-body)' }, n.text),
        h('td', { class: n.diary ? 'leak' : n.followed ? '' : 'small' }, n.diary ? 'Not a headline' : n.followed ? `${REGIMES[n.kind].label} within ${HORIZON}d` : 'Nothing: noise'),
      ),
    ),
  );
}

function renderProof(r: Round): void {
  const box = $('#proofBox');
  box.hidden = !r.proof;
  if (!r.proof) return;
  const rows = tuningCheck(r.proof.tuning, r.m);
  const youNow = stats(r.eqBars).ret;
  const tuned = rows.filter((row) => row.tuned);
  const pool = tuned.length ? tuned : rows.filter((row) => row.S.id !== 'bh');
  const avg = (f: (row: (typeof rows)[number]) => number) => (pool.length ? pool.reduce((a, row) => a + f(row), 0) / pool.length : 0);
  const [before, after] = [avg((row) => row.before), avg((row) => row.after)];
  fill(
    $('#proofNote'),
    tuned.length ? 'Your tuned bots' : 'Your bots (none were tuned)',
    ` averaged ${pct(before)} on the tape you tuned them on and `,
    h('b', { class: signClass(after) }, pct(after)),
    ` on this one. ${before - after > 0.01 ? 'What a settings search finds on one path mostly fails to carry over.' : 'Here the edge carried over; one hidden tape is still just one sample.'}`,
  );
  const change = (v: number) => h('td', { class: signClass(v) }, (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + ' pts');
  fill(
    $('#proofBody'),
    ...rows.map((row) =>
      h(
        'tr',
        null,
        h('td', null, h('span', { class: 'sw', style: `background:var(${row.S.color})` }), h('b', null, row.S.call)),
        h('td', null, row.tuned ? 'tuned' : 'default'),
        h('td', { class: signClass(row.before) }, pct(row.before)),
        h('td', { class: signClass(row.after) }, pct(row.after)),
        change(row.after - row.before),
      ),
    ),
    h(
      'tr',
      null,
      h('td', null, h('span', { class: 'sw', style: 'background:var(--accent)' }), h('b', null, 'You')),
      h('td', null, '—'),
      h('td', { class: signClass(r.proof.youRet) }, pct(r.proof.youRet)),
      h('td', { class: signClass(youNow) }, pct(youNow)),
      change(youNow - r.proof.youRet),
    ),
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
  renderProof(r);
  renderWireRecap(r);
  renderReview(r);
  renderPlayerReplay(r, s);
  const rows = standings(r, s);
  $<HTMLSelectElement>('#shadeSel').value = view.shade;
  fill($('#tbody'), ...rows.map(standingRow));

  const shaded = view.shade === 'you' ? null : view.shade === 'ghost' ? { pos: r.ghost.pos } : game.bots.find((b) => b.S.id === view.shade);
  drawTapeChart($<HTMLCanvasElement>('#debPrice'), r.m, shaded ? shaded.pos : r.posBars, shaded ? null : r.trades);
  const highlighted = (id: string) => id === 'you' || id === view.shade;
  drawEquityChart(
    $<HTMLCanvasElement>('#debEq'),
    rows.map((row) => ({ eq: row.eq, color: row.color, bold: highlighted(row.id), dim: !highlighted(row.id), dash: DASHES[row.id] })),
    r.m.n - r.m.warm,
  );
}

export function initDebrief(): void {
  onEnter('debrief', () => ($('#debrief').scrollTop = 0));
  $('#tabRaceBtn').addEventListener('click', () => setTab('race'));
  $('#tabLabBtn').addEventListener('click', () => setTab('lab'));
  $('#loreBtn').addEventListener('click', () => showScreen('notes'));
  $<HTMLSelectElement>('#shadeSel').addEventListener('change', (e) => {
    view.shade = (e.target as HTMLSelectElement).value;
    renderDebrief();
  });
  new ResizeObserver(() => {
    if (currentScreen() === 'debrief') renderDebrief();
  }).observe(document.body);
}

