/* Backtest lab tab: bot cards with editable settings, the CROSS parameter sweep heatmap and
 * the out-of-sample check on 100 fresh markets. */

import type { Market } from '../engine/market';
import { SWEEP_FAST, SWEEP_SLOW, outOfSample, smaSweep, type OutOfSampleRow } from '../engine/research';
import { STRATS, strategy, type NumberParam, type ParamDef, type Strategy, type StrategyId } from '../engine/strategies';
import { pct, signClass } from '../format';
import { computeBots, game, type Round } from '../game/round';
import { lab, persist } from '../game/save';
import { $, classes, fill, h } from './dom';

const ROBUST_INTRO =
  'A setting that won here may have just fit this one path. Run every enabled bot, with its current settings, on 100 new markets it has never seen.';

let sweep: (number | null)[][] | null = null;
let onLabChange: () => void = () => {};

/** Clears per-round lab output when a new debrief opens. */
export function resetLab(): void {
  $('#robWrap').hidden = true;
  $('#robNote').textContent = ROBUST_INTRO;
  sweep = null;
}

function labChanged(): void {
  persist();
  if (game.round) computeBots(game.round.m);
  if (!$('#robWrap').hidden) $('#robNote').textContent = 'Settings changed since the last run. Run it again to update.';
  onLabChange();
}

/* ---------- bot cards ---------- */

const paramId = (S: Strategy, p: ParamDef) => `p-${S.id}-${p.k}`;

function clampParam(p: NumberParam, raw: string): number {
  let v = parseFloat(raw);
  if (!isFinite(v)) v = p.v;
  v = Math.min(p.max, Math.max(p.min, v));
  return p.step ? v : Math.round(v);
}

function paramInput(S: Strategy, p: ParamDef): HTMLElement {
  const id = paramId(S, p);
  const params = lab[S.id].params;
  if (p.type === 'bool') {
    const box = h('input', { type: 'checkbox', id, checked: !!params[p.k] });
    box.addEventListener('change', () => {
      params[p.k] = box.checked;
      paramChanged(S);
    });
    return h('label', null, box, p.label);
  }
  const input = h('input', { type: 'number', id, min: p.min, max: p.max, step: p.step || 1, value: params[p.k] as number });
  input.addEventListener('change', () => {
    const v = clampParam(p, input.value);
    input.value = String(v);
    params[p.k] = v;
    paramChanged(S);
  });
  return h('label', { for: id }, p.label, input);
}

function paramChanged(S: Strategy): void {
  if (S.id === 'sma') sweep = null;
  labChanged();
}

function card(S: Strategy): HTMLElement {
  const enabled = h('input', { type: 'checkbox', id: `en-${S.id}`, checked: lab[S.id].on });
  enabled.addEventListener('change', () => {
    lab[S.id].on = enabled.checked;
    labChanged();
  });
  return h(
    'div',
    { class: 'card', id: `card-${S.id}` },
    h(
      'div',
      { class: 'card-top' },
      h('label', null, enabled, h('span', { class: 'tag', style: `--c:var(${S.color})` }, S.call), S.name),
      h('span', { class: 'm', id: `m-${S.id}` }),
    ),
    h('p', { class: 'desc' }, S.desc),
    S.params.length > 0 && h('div', { class: 'params' }, ...S.params.map((p) => paramInput(S, p))),
  );
}

/** Pushes current settings back into a card's inputs. */
function syncCard(id: StrategyId): void {
  for (const p of strategy(id).params) {
    const el = $<HTMLInputElement>('#' + paramId(strategy(id), p));
    if (p.type === 'bool') el.checked = !!lab[id].params[p.k];
    else el.value = String(lab[id].params[p.k]);
  }
}

/* ---------- sweep heatmap ---------- */

function renderSweep(m: Market, bhRet: number): void {
  const settings = lab.sma.params;
  sweep ||= smaSweep(m, !!settings.short);
  const grid = sweep;

  let maxAbs = 0;
  let best: { v: number; f: number; s: number } | null = null;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const v = grid[i][j];
      if (v == null) continue;
      maxAbs = Math.max(maxAbs, Math.abs(v));
      if (!best || v > best.v) best = { v, f: SWEEP_FAST[i], s: SWEEP_SLOW[j] };
    }
  }

  const cell = (v: number | null, fast: number, slow: number) => {
    if (v == null) return h('button', { class: 'na', disabled: true, 'aria-label': 'Not valid', type: 'button' }, '·');
    const alpha = Math.round(Math.min(1, Math.abs(v) / (maxAbs || 1)) * 72) + 8;
    return h(
      'button',
      {
        type: 'button',
        class: settings.fast === fast && settings.slow === slow ? 'cur' : '',
        style: `background:color-mix(in oklab, var(${v >= 0 ? '--up' : '--down'}) ${alpha}%, var(--panel))`,
        title: `Fast ${fast}, slow ${slow}: ${pct(v)}`,
        onclick: () => {
          settings.fast = fast;
          settings.slow = slow;
          syncCard('sma');
          labChanged();
        },
      },
      (v * 100).toFixed(0),
    );
  };

  const el = $('#heat');
  el.style.gridTemplateColumns = `40px repeat(${SWEEP_SLOW.length},minmax(34px,1fr))`;
  fill(
    el,
    h('div', { class: 'hd' }, 'f\\s'),
    ...SWEEP_SLOW.map((s) => h('div', { class: 'hd' }, s)),
    ...SWEEP_FAST.flatMap((f, i) => [h('div', { class: 'hd' }, f), ...SWEEP_SLOW.map((s, j) => cell(grid[i][j], f, s))]),
  );

  const note = $('#heatNote');
  if (!best) {
    fill(note);
    return;
  }
  fill(
    note,
    'Best pair on this tape: ',
    h('b', null, `fast ${best.f} / slow ${best.s} at ${pct(best.v)}`),
    `, against ${pct(bhRet)} for INDEX. A sweep always finds a winner after the fact. Test it on fresh markets before you trust it.`,
  );
}

/* ---------- out-of-sample ---------- */

function robustRow(r: OutOfSampleRow): HTMLTableRowElement {
  return h(
    'tr',
    null,
    h('td', null, h('span', { class: 'sw', style: `background:var(${r.S.color})` }), h('b', null, r.S.call)),
    h('td', { class: signClass(r.median) }, pct(r.median)),
    h('td', null, pct(r.mean)),
    h('td', null, pct(r.worst)),
    h('td', null, r.S.id === 'bh' ? '—' : r.beat + '%'),
    h('td', null, r.medianSharpe.toFixed(2)),
  );
}

function runRobust(): void {
  const m = game.round?.m;
  if (!m) return;
  const rows = outOfSample(m, lab, 100);
  fill($('#robBody'), ...rows.map(robustRow));
  $('#robWrap').hidden = false;
  const how = m.csv ? 'default synthetic settings, since your CSV is a single real history' : 'the same difficulty settings';
  fill($('#robNote'), `100 new markets with ${how}. Highest median: `, h('b', null, rows[0].S.call), ` at ${pct(rows[0].median)}.`);
}

/* ---------- tab ---------- */

export function renderLab(r: Round, bhRet: number): void {
  for (const b of game.bots) {
    const metric = $('#m-' + b.S.id);
    metric.textContent = pct(b.st.ret);
    metric.className = classes('m', signClass(b.st.ret));
    $('#card-' + b.S.id).classList.toggle('off', !lab[b.S.id].on);
  }
  renderSweep(r.m, bhRet);
}

/** Builds the bot cards once. `onChange` re-renders the debrief after any setting change. */
export function initLab(onChange: () => void): void {
  onLabChange = onChange;
  fill($('#cards'), ...STRATS.map(card));
  $('#robBtn').addEventListener('click', runRobust);
}
