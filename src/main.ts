/* Blind Tape entry point: wires the screens together and connects the daily board. */

import './styles.css';
import { initRemote, onRemoteChange } from './daily/remote';
import { initDaily, renderDailyAll } from './ui/daily';
import { initDebrief, renderDebrief, showDebrief } from './ui/debrief';
import { initInput } from './ui/input';
import { initLab } from './ui/lab';
import { initPlay } from './ui/play';
import { showScreen } from './ui/screens';
import { initTitle } from './ui/title';

initTitle();
initPlay(showDebrief);
initDebrief();
initLab(renderDebrief);
initDaily();
initInput();
onRemoteChange(renderDailyAll);

function start(): void {
  showScreen('title');
  initRemote();
}

// Hot reload support in the claude.ai artifact runtime; a plain page just starts.
const hot = window.claude?.hot;
hot?.snapshot?.(() => ({}));
if (hot?.ready) hot.ready(start);
else start();
