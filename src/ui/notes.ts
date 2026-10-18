/* The author's notes, in full, newest first. */

import { body, stamp, unlocked } from '../game/diary';
import { progress } from '../game/save';
import { $, fill, h } from './dom';
import { onEnter, showScreen } from './screens';

function renderNotes(): void {
  fill(
    $('#notesEntries'),
    ...[...unlocked(progress())].reverse().map((e) => h('article', null, h('time', null, stamp(e)), h('p', null, body(e)))),
  );
  $('#notes').scrollTop = 0;
}

export function initNotes(): void {
  onEnter('notes', renderNotes);
  $('#notesBack').addEventListener('click', () => showScreen('title'));
}
