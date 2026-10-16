/* Daily challenge panels: the title-screen card with the mini board, and the debrief's
 * share box and full board. Player names come from other users, so they are only ever
 * inserted as text. */

import { dailyNo, dayLabel, timeToNextTape, todayUTC } from '../daily/dates';
import { boardRows, myDaily, remote, subscribeBoard, type BoardRow } from '../daily/remote';
import { shareText } from '../daily/share';
import { pct, signClass, starRow } from '../format';
import { playDaily } from '../game/actions';
import { game, isDailyMode } from '../game/round';
import { save } from '../game/save';
import { $, classes, fill, h, type Child } from './dom';
import { currentScreen } from './screens';

const emptyRow = (text: string) => h('li', { class: 'empty' }, text);

function boardItems(limit: number): HTMLLIElement[] {
  if (!remote.ready) return [emptyRow('Connecting to the board…')];
  if (!remote.db) {
    return [
      emptyRow(
        'The shared board works when this page is open on claude.ai and you are signed in. Your runs are kept on this device.',
      ),
    ];
  }
  if (remote.err) return [emptyRow('The board could not load. Reopen the page to try again.')];
  const rows = boardRows();
  if (!rows.length) return [emptyRow('No runs posted yet today. Be the first.')];

  // Always show the player's own row, replacing the last one if needed.
  let shown = rows.slice(0, limit);
  const me = rows.find((x) => x.r.id === remote.uid);
  if (me && !shown.includes(me)) shown = [...shown.slice(0, limit - 1), me];
  return shown.map(boardItem);
}

function boardItem({ r, rank }: BoardRow): HTMLLIElement {
  const isMe = r.id === remote.uid;
  const name = isMe ? 'You' : remote.names[r.id] || 'Someone';
  const done = rank != null;
  const ret = r.ret as number;
  return h(
    'li',
    { class: isMe ? 'me' : '' },
    h('span', { class: 'rk' }, done ? rank : '—'),
    h('span', { class: 'nm' }, name),
    h('span', { class: classes('rt', done && signClass(ret)) }, done ? pct(ret) : 'DNF'),
    h('span', { class: 'st' }, done ? '★'.repeat(Math.max(0, Math.min(3, (r.stars ?? 0) | 0))) : ''),
  );
}

function countText(): string {
  const rows = boardRows();
  const done = rows.filter((x) => x.rank != null).length;
  if (!remote.db || remote.err || !rows.length) return '';
  return `${done} finished` + (rows.length > done ? ` · ${rows.length - done} DNF` : '');
}

/** "Your run: +3.2% · ★★☆ · #4 of 12", or a DNF notice. */
function myLine(): Child[] {
  const mine = myDaily();
  if (!mine) return [];
  if (mine.status !== 'done') return [h('span', { class: 'down' }, 'Your ranked run did not finish (DNF).')];
  const ret = mine.ret as number;
  const rows = boardRows();
  const me = rows.find((x) => x.r.id === remote.uid);
  const done = rows.filter((x) => x.rank != null).length;
  return [
    'Your run: ',
    h('b', { class: signClass(ret) }, pct(ret)),
    ' · ',
    h('span', { style: 'color:var(--gold)' }, starRow(mine.stars || 0)),
    me?.rank ? ` · #${me.rank} of ${done}` : '',
  ];
}

export function renderDaily(): void {
  const day = todayUTC();
  const played = !!myDaily();
  $('#dailyEyebrow').textContent = `Daily challenge #${dailyNo(day)} · ${dayLabel(day)}`;
  fill($('#dailyMine'), ...myLine());
  fill(
    $('#dailyBtns'),
    played
      ? h('button', { class: 'btn', id: 'dPractice', type: 'button', onclick: () => playDaily(false) }, "Practice today's tape")
      : h('button', { class: 'btn primary', id: 'dPlay', type: 'button', onclick: () => playDaily(true) }, "Play today's tape"),
  );
  $('#dailyReset').textContent = timeToNextTape();
  fill($('#boardMini'), ...boardItems(8));
  $('#boardCount').textContent = countText();
}

const todaysShareText = () => shareText(todayUTC(), save.daily[todayUTC()]);

function postNote(): string {
  if (game.round?.mode === 'practice') return 'Practice runs are not posted. Your ranked run is the one on the board.';
  if (!remote.db) return 'Saved on this device. The shared board works when this page is open on claude.ai and you are signed in.';
  if (!remote.uid || remote.canWrite === false) {
    return 'You can play, but your access to this page is view-only, so your run is not posted. Ask the owner for Contributor access.';
  }
  if (remote.postErr) return `Posting failed (${remote.postErr}). Your result is saved on this device.`;
  return 'Posted. Everyone who opens this page sees today’s board.';
}

export function renderDailyDebrief(): void {
  const text = todaysShareText();
  $<HTMLTextAreaElement>('#shareText').value = text || 'Play your ranked run to get a shareable result.';
  $<HTMLButtonElement>('#copyBtn').disabled = !text;
  $('#postNote').textContent = postNote();
  fill($('#boardFull'), ...boardItems(50));
  $('#boardCount2').textContent = countText();
}

/** Re-renders whichever daily panel is on screen. */
export function renderDailyAll(): void {
  const screen = currentScreen();
  if (screen === 'title') renderDaily();
  else if (screen === 'debrief' && game.round && isDailyMode(game.round.mode)) renderDailyDebrief();
}

export function initDaily(): void {
  const copyBtn = $<HTMLButtonElement>('#copyBtn');
  copyBtn.addEventListener('click', () => {
    const text = todaysShareText();
    if (!text) return;
    const fallback = () => {
      const ta = $<HTMLTextAreaElement>('#shareText');
      ta.focus();
      ta.select();
      copyBtn.textContent = 'Press Ctrl+C or ⌘C';
    };
    try {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied';
        setTimeout(() => (copyBtn.textContent = 'Copy result'), 1600);
      }, fallback);
    } catch {
      fallback();
    }
  });

  // Pick up the next day's board and keep the countdown fresh.
  setInterval(() => {
    if (remote.ready && remote.db) subscribeBoard();
    if (currentScreen() === 'title') renderDaily();
  }, 30000);
}
