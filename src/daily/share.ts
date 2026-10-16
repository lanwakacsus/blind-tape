/* The shareable daily result: a one-line summary plus a ten-square equity sparkline. */

import { ordinal, pct, starRow } from '../format';
import type { DailyRecord } from '../game/save';
import { dailyNo, dayLabel } from './dates';

/** Ten squares, one per tenth of the tape: green up, red down, white roughly flat. */
export function shareGrid(eq: number[]): string {
  const n = eq.length - 1;
  const seg = n / 10;
  let grid = '';
  for (let i = 0; i < 10; i++) {
    const a = eq[Math.round(i * seg)];
    const b = eq[Math.round((i + 1) * seg)];
    const r = a > 0 ? b / a - 1 : 0;
    grid += r > 0.002 ? '🟩' : r < -0.002 ? '🟥' : '⬜';
  }
  return grid;
}

/** Share text for a finished ranked run, or '' if there is none. */
export function shareText(day: string, run: DailyRecord | undefined): string {
  if (!run || run.status !== 'done') return '';
  const stars = run.stars ?? 0;
  return [
    `Blind Tape daily #${dailyNo(day)} (${dayLabel(day)})`,
    `${pct(run.ret ?? 0)} · ${ordinal(run.place ?? 0)} of ${run.racers} vs bots · ${starRow(stars)}`,
    run.grid ?? '',
  ].join('\n');
}
