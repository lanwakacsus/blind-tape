/* The quotes he kept, newest first. */

import { QUOTES, dayLabel } from '../game/quotes';
import { $, fill, h } from './dom';
import { onEnter, showScreen } from './screens';

function renderQuotes(): void {
  fill(
    $('#quoteList'),
    ...[...QUOTES].reverse().map((q) =>
      h('article', null, h('time', null, dayLabel(q.day)), h('blockquote', null, `“${q.text}”`), h('cite', null, `— ${q.source}`)),
    ),
  );
  $('#quotes').scrollTop = 0;
}

export function initQuotes(): void {
  onEnter('quotes', renderQuotes);
  $('#quotesBack').addEventListener('click', () => showScreen('title'));
}
