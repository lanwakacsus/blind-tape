/* The tape archive: every daily tape from launch to his last night, with his marks. */

import { archiveRows, shapeWord, type ArchiveRow } from '../engine/archive';
import { REGIMES, dailyMarket } from '../engine/market';
import { pct, signClass } from '../format';
import { startRound } from '../game/round';
import { dayLabel } from '../game/quotes';
import { $, $$, fill, h } from './dom';
import { onEnter, showScreen } from './screens';

type Filter = 'all' | 'crash' | 'marks';

let rows: ArchiveRow[] | null = null;
let filter: Filter = 'all';

const keep: Record<Filter, (r: ArchiveRow) => boolean> = {
  all: () => true,
  crash: (r) => r.firstCrash != null,
  marks: (r) => r.note != null,
};

function row(r: ArchiveRow): HTMLTableRowElement {
  const again = !!r.note?.includes('AGAIN');
  return h(
    'tr',
    { style: 'cursor:default' },
    h('td', { style: 'text-align:left' }, dayLabel(r.day)),
    h('td', null, String(r.seed)),
    h(
      'td',
      { style: 'text-align:left;white-space:normal' },
      ...r.shape.map((s) =>
        h(
          'span',
          { class: 'shape', title: `${REGIMES[s.k].label}, ${s.days} days`, style: `background:color-mix(in oklab, var(${REGIMES[s.k].tint}) ${Math.round(REGIMES[s.k].a * 100)}%, var(--panel))` },
          `${shapeWord(s.k)} ${s.days}`,
        ),
      ),
    ),
    h('td', { class: again ? 'again' : '' }, r.firstCrash == null ? '\u2014' : `day ${r.firstCrash}`),
    h('td', { class: signClass(r.hold) }, pct(r.hold)),
    h('td', null, `${r.best.call} ${pct(r.best.ret)}`),
    h('td', { class: 'scrawl', style: 'text-align:left;white-space:normal' }, r.note ?? ''),
    h('td', null, h('button', { class: 'btn', type: 'button', onclick: () => startRound(dailyMarket(r.day), null, 'archive') }, 'Play')),
  );
}

function render(): void {
  rows ||= archiveRows();
  const shown = rows.filter(keep[filter]).reverse();
  $('#archiveCount').textContent = `${shown.length} of ${rows.length} tapes`;
  for (const b of $$('[data-filter]')) b.setAttribute('aria-pressed', String(b.dataset.filter === filter));
  fill($('#archiveBody'), ...shown.map(row));
}

export function initArchive(): void {
  onEnter('archive', () => {
    render();
    $('#archive').scrollTop = 0;
  });
  $('#archiveBack').addEventListener('click', () => showScreen('title'));
  for (const b of $$('[data-filter]')) {
    b.addEventListener('click', () => {
      filter = b.dataset.filter as Filter;
      render();
    });
  }
}
