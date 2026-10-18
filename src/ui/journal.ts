/* The journal screen: lifetime numbers, habits across rounds, and the rounds themselves. */

import { pct, signClass } from '../format';
import { habits, lifetime } from '../game/journal';
import { save } from '../game/save';
import { $, fill, h } from './dom';
import { onEnter, showScreen } from './screens';

const SHOWN = 30;
const GRADE_CLASS: Record<string, string> = { A: 'gA', B: 'gB', C: 'gC', D: 'gD', F: 'gF' };

function render(): void {
  const entries = save.journal;
  const lt = lifetime(entries);
  $('#journalCount').textContent = `${lt.rounds} round${lt.rounds === 1 ? '' : 's'} recorded`;
  const tile = (label: string, value: string, hint: string, tone = '') => h('div', { class: 'tile', title: hint }, h('span', null, label), h('b', { class: tone }, value));
  const gpa = lt.rounds ? lt.gpa.toFixed(1) : '\u2014';
  fill(
    $('#journalTiles'),
    tile('Rounds', String(lt.rounds), 'Every round you finished, in every mode.'),
    tile('Profitable', lt.rounds ? `${lt.profitable} of ${lt.rounds}` : '\u2014', 'Rounds that ended above where they started.'),
    tile('Beat buy & hold', lt.rounds ? `${lt.beatHold} of ${lt.rounds}` : '\u2014', 'Rounds where you did better than simply holding.'),
    tile('Average round', lt.rounds ? pct(lt.avgRet) : '\u2014', 'Your average return per round.', signClass(lt.avgRet)),
    tile('Average grade', gpa, 'Risk grades averaged, A = 4 down to F = 0.'),
    tile('Trades', String(lt.trades), 'Trades opened and closed.'),
    tile('Win rate', lt.trades ? Math.round(lt.winRate * 100) + '%' : '\u2014', 'Share of all your trades that made money.'),
    tile('Expectancy', lt.trades ? pct(lt.expectancy, 2) : '\u2014', 'Average result of one trade, across every round.', signClass(lt.expectancy)),
    tile('Fees paid', pct(-lt.fees, 1), 'Total fees, in starting accounts.', 'down'),
    tile('Stopped out', String(lt.stops), 'Times a stop-loss closed a trade.'),
  );

  fill($('#journalHabits'), ...habits(entries).map((line) => h('li', null, line)));

  const last = entries.slice(-SHOWN);
  const scale = Math.max(0.01, ...last.map((e) => Math.abs(e.ret)));
  fill(
    $('#journalSpark'),
    ...last.map((e) =>
      h('span', { class: 'spark-col', title: `${e.market}: ${pct(e.ret)}` }, h('b', { class: e.ret >= 0 ? 'up' : 'down', style: `height:${(Math.abs(e.ret) / scale) * 48}%;${e.ret >= 0 ? 'bottom' : 'top'}:50%` })),
    ),
  );

  fill(
    $('#journalMarkets'),
    ...lt.byMarket.map((m) => h('tr', { style: 'cursor:default' }, h('td', null, m.market), h('td', null, m.n), h('td', { class: signClass(m.avgRet) }, pct(m.avgRet)))),
  );

  fill(
    $('#journalRounds'),
    ...[...entries]
      .reverse()
      .slice(0, 25)
      .map((e) =>
        h(
          'tr',
          { style: 'cursor:default' },
          h('td', null, new Date(e.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })),
          h('td', { style: 'text-align:left' }, e.market),
          h('td', { class: signClass(e.ret) }, pct(e.ret)),
          h('td', { class: signClass(e.bhRet) }, pct(e.bhRet)),
          h('td', null, pct(e.dd)),
          h('td', null, e.trades),
          h('td', null, h('b', { class: GRADE_CLASS[e.grade] }, e.grade)),
        ),
      ),
  );
  $('#journal').scrollTop = 0;
}

export function initJournal(): void {
  onEnter('journal', render);
  $('#journalBack').addEventListener('click', () => showScreen('title'));
}
