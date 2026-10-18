/* Title screen: season map, play and CSV buttons, new-season reset, daily card. */

import { LEVELS, parseCSV } from '../engine/market';
import { starRow } from '../format';
import { playLevel } from '../game/actions';
import { body, stamp, unlocked } from '../game/diary';
import { lastDays, seedLog } from '../engine/seedlog';
import { QUOTE_OF_THE_DAY, bootLines, isLate } from '../game/lore';
import { startRound } from '../game/round';
import { isUnlocked, newSeason, nextLevel, progress, save, totalStars } from '../game/save';
import { startTitleBackground } from '../render/titleBackground';
import { renderDaily } from './daily';
import { photo } from '../game/credits';
import { $, classes, fill, h, icon } from './dom';
import { SRC } from './photos';
import { currentScreen, onEnter, showScreen, type ScreenId } from './screens';
import { QUOTES } from '../game/quotes';

export function renderTitle(): void {
  fill(
    $('#epigraph'),
    h('div', { class: 'kicker' }, 'Quote of the day'),
    h('blockquote', null, `\u201c${QUOTE_OF_THE_DAY.text}\u201d`),
    h('figcaption', null, `\u2014 ${QUOTE_OF_THE_DAY.source} (last changed ${UPDATED_LABEL}. i can't change it. i've tried.)`),
    h('button', { class: 'btn', type: 'button', onclick: () => showScreen('quotes') }, 'Quotes I like'),
  );
  fill(
    $('#gallery'),
    ...(['ken', 'lonely', 'rick'] as const).map((id) =>
      h('figure', { class: 'shot' }, h('img', { src: SRC[id], alt: photo(id).label, loading: 'lazy' }), h('figcaption', null, `${photo(id).label} \u00b7 ${photo(id).author}, ${photo(id).license}`)),
    ),
  );
  const days = Math.floor((Date.now() - UPDATED_AT) / 86400000);
  fill(
    $('#sitefoot'),
    h('div', null, `This page was last updated ${UPDATED_LABEL} (${days.toLocaleString('en-US')} days ago).`),
    h('div', null, '\u00a9 2009\u20132011 M. Hale. DO NOT COPY. I WILL KNOW.'),
    h('div', null, 'Total visitors since 2009: 312.'),
    h('div', null, 'Best viewed in black. Optimised for size 43.'),
    h('div', null, 'Photographs are not mine: ', h('a', { href: '#/credits' }, 'credits'), '.'),
    h('div', null, 'If everything goes to plan, I will update this game every year'),

  );
  fill(
    $('#seedBody'),
    ...seedLog(lastDays(LOG_ENDS, 14)).map((row) =>
      h(
        'tr',
        null,
        h('td', null, row.day),
        h('td', null, String(row.seed)),
        h('td', { class: row.note?.includes('AGAIN') ? 'again' : '' }, row.firstCrash == null ? 'none' : `day ${row.firstCrash}`),
        h('td', { class: 'scrawl' }, row.note ?? ''),
      ),
    ),
  );
  fill(
    $('#postList'),
    ...[...unlocked(progress())].reverse().slice(0, 3).map((e) => h('article', null, h('time', null, stamp(e)), h('p', null, body(e)))),
  );
  const kb = (n: number) => (n < 1024 ? `${n}B` : `${(n / 1024).toFixed(1)}K`);
  const notesBytes = unlocked(progress()).reduce((a, e) => a + body(e).length, 0);
  const quotesBytes = QUOTES.reduce((a, q) => a + q.text.length + q.source.length + 12, 0);
  const files: { name: string; open: ScreenId | null; route?: string; when: string; size: string }[] = [
    { name: 'index.html', open: null, when: '14-Mar-2011 03:17', size: '152K' },
    { name: 'notes.txt', open: 'notes', when: '14-Mar-2011 03:17', size: kb(notesBytes) },
    { name: 'quotes.txt', open: 'quotes', when: '14-Mar-2011 03:11', size: kb(quotesBytes) },
    { name: 'claims/', open: 'claims', when: '02-Feb-2011 01:40', size: '-' },
    { name: 'archive/', open: 'archive', when: '14-Mar-2011 03:17', size: '-' },
    { name: 'robots.txt', open: null, route: '/robots.txt', when: '14-Mar-2011 03:17', size: '112B' },
    { name: 'sitemap.xml', open: null, route: '/sitemap.xml', when: '13-Mar-2011 22:40', size: '612B' },
    { name: 'playlist.m3u', open: null, route: '/playlist.m3u', when: '09-Mar-2011 23:58', size: '96B' },
    { name: 'geobasket.jpg', open: null, route: '/geobasket', when: '07-Mar-2011 03:44', size: '0B' },
    { name: 'a_great_chaos.mp3', open: null, route: '/a-great-chaos', when: '19-Jan-2011 05:20', size: '0B' },
    { name: 'lookbook/', open: null, route: '/lookbook', when: '08-Mar-2011 03:03', size: '-' },
    { name: 'sizes.txt', open: null, route: '/size-chart', when: '09-Mar-2011 03:21', size: '43B' },
    { name: 'm.bot', open: null, when: '14-Mar-2011 03:17', size: 'running' },
    { name: 'journal.db', open: 'journal', when: '(yours)', size: kb(JSON.stringify(save.journal).length) },
  ];
  fill(
    $('#fileList'),
    ...files.map((f) =>
      h(
        'li',
        null,
        f.open || f.route ? h('button', { type: 'button', 'data-open': f.open, 'data-route': f.route }, f.name) : h('span', { class: 'plain' }, f.name),
        h('span', { class: 'size' }, f.size),
        h('span', { class: 'meta' }, f.when),
      ),
    ),
  );
  const row = (label: string, value: string) => h('div', { class: 'row' }, h('span', null, label), h('b', null, value));
  fill(
    $('#statusBox'),
    row('uptime', `${days.toLocaleString('en-US')} days`),
    row('last login', 'admin, 14 Mar 2011 03:17'),
    row('users', '1 (you)'),
    row('load', '0.00 0.00 0.00'),
    row('tapes', '224 archived'),
    row('visits', '312'),
    row('indexed', 'no'),
  );
  $('#rawSeeds').textContent = seedLog(lastDays(LOG_ENDS, 24))
    .map((r) => `${r.day} ${r.seed.toString(16).padStart(8, '0')} ${r.firstCrash == null ? '---' : 'd' + String(r.firstCrash).padStart(3, '0')}`)
    .join('\n');

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
          'aria-label': `Market ${i + 1}, ${L.ticker}, ${L.sub}` + (open ? `, ${stars} of 3 stars` : ', locked'),
          onclick: () => playLevel(i),
        },
        icon(L.icon, 'icon node-icon'),
        h('b', null, i + 1),
        h('span', null, `${L.ticker} \u00b7 ${L.sub}`),
        h('em', null, open ? starRow(stars) : 'Locked'),
      );
    }),
  );
  $('#playBtn').textContent = totalStars() > 0 ? `Continue: market ${next + 1}` : `Play market ${next + 1}`;
  $('#muteBtn').textContent = save.muted ? 'Sound off' : 'Sound on';
  $('#starTotal').textContent = `★ ${totalStars()} / ${LEVELS.length * 3}`;
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

const VISIT_KEY = 'blindtape.visit';
/** The last day the author logged a seed. */
const LOG_ENDS = '2011-03-14';

/** The date nobody has touched the page since. */
const UPDATED_AT = Date.UTC(2011, 2, 14);
const UPDATED_LABEL = '14 March 2011';

/** Counts this visit and returns how long ago the previous one was. */
function recordVisit(): { visits: number; sinceLast: number | null } {
  let visits = 0;
  let last: number | null = null;
  try {
    const stored = JSON.parse(localStorage.getItem(VISIT_KEY) as string);
    if (stored && typeof stored.n === 'number' && typeof stored.last === 'number') ({ n: visits, last } = stored);
    localStorage.setItem(VISIT_KEY, JSON.stringify({ n: visits + 1, last: Date.now() }));
  } catch {
    // Storage blocked: every visit is a first visit.
  }
  return { visits: visits + 1, sinceLast: last == null ? null : Math.max(0, Date.now() - last) };
}

let greeted = false;

/** Greets the visitor once per page load. */
function greet(): void {
  if (greeted) return;
  greeted = true;
  const late = isLate(new Date());
  if (late) document.title = 'i said not to';
  fill($('#boot'), ...bootLines({ ...recordVisit(), late, uptimeDays: Math.floor((Date.now() - UPDATED_AT) / 86400000) }).map((line) => h('div', null, line)));
}

export function initTitle(): void {
  onEnter('title', () => {
    renderTitle();
    greet();
    startTitleBackground($<HTMLCanvasElement>('#bgTape'), () => currentScreen() === 'title');
  });
  $('#playBtn').addEventListener('click', () => playLevel(nextLevel()));
  for (const id of ['#notesBtn', '#postsAll']) $(id).addEventListener('click', () => showScreen('notes'));
  $('#fileList').addEventListener('click', (e) => {
    const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-open], [data-route]');
    if (hit?.dataset.route) location.hash = '#' + hit.dataset.route;
    else if (hit?.dataset.open) showScreen(hit.dataset.open as ScreenId);
  });
  $('#claimsBtn').addEventListener('click', () => showScreen('claims'));
  $('#journalBtn').addEventListener('click', () => showScreen('journal'));
  $('#archiveBtn').addEventListener('click', () => showScreen('archive'));
  const seasonBtn = $<HTMLButtonElement>('#seasonBtn');
  seasonBtn.addEventListener('click', () => armNewSeason(seasonBtn));
  const csvIn = $<HTMLInputElement>('#csvIn');
  csvIn.addEventListener('change', () => loadCsv(csvIn));
}
