/* Blind Tape entry point: wires the screens together and connects the daily board. */

import './styles.css';
import { initRemote, onRemoteChange } from './daily/remote';
import { initDaily, renderDailyAll } from './ui/daily';
import { initDebrief, renderDebrief, showDebrief } from './ui/debrief';
import { initInput } from './ui/input';
import { initJournal } from './ui/journal';
import { initArchive } from './ui/archive';
import { initClaims } from './ui/claims';
import { initLab } from './ui/lab';
import { initNotes } from './ui/notes';
import { applyRoute, initPage } from './ui/page';
import { initPlay } from './ui/play';
import { initQuotes } from './ui/quotes';
import { showScreen } from './ui/screens';
import { initTitle } from './ui/title';

initTitle();
initPlay(showDebrief);
initDebrief();
initLab(renderDebrief);
initDaily();
initNotes();
initClaims();
initQuotes();
initJournal();
initArchive();
initPage();
initInput();
onRemoteChange(renderDailyAll);

function start(): void {
  showScreen('title');
  applyRoute();
  initRemote();
}

// Hot reload support in the claude.ai artifact runtime; a plain page just starts.
const hot = window.claude?.hot;
hot?.snapshot?.(() => ({}));
if (hot?.ready) hot.ready(start);
else start();
