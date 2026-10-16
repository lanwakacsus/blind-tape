/* Ways into a round, shared by the title screen, debrief buttons and keyboard. */

import { LEVELS, dailyMarket, genMarket, makeMarket } from '../engine/market';
import { todayUTC } from '../daily/dates';
import { myDaily, startDailyRun } from '../daily/remote';
import { isDailyMode, startRound, type Round } from './round';
import { isUnlocked, levelSeed } from './save';

export function playLevel(i: number): void {
  if (!isUnlocked(i)) return;
  startRound(genMarket(levelSeed(i), LEVELS[i]), i, 'season');
}

/** Today's tape. Only the first ranked attempt counts; later ones become practice. */
export function playDaily(ranked: boolean): void {
  const day = todayUTC();
  const m = dailyMarket(day);
  if (ranked && myDaily()) ranked = false;
  if (ranked) startDailyRun(day);
  startRound(m, null, ranked ? 'daily' : 'practice');
}

/** Plays the same tape again. A daily tape replays as practice. */
export function replay(r: Round): void {
  const { m, lvl, mode } = r;
  if (isDailyMode(mode)) startRound(dailyMarket(m.day!), null, 'practice');
  else if (lvl == null) startRound(makeMarket({ ...m }), lvl, mode);
  else startRound(genMarket(m.seed!, m.opts), lvl, mode);
}
