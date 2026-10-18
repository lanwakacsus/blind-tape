/* The archive of daily tapes from the author's active months, with his marks in the margin.
 * Every number is computed from the tape; his notes only ever say what the data says (or, on
 * a few dates, what happened to him). Pure: no DOM. */

import { backtest, stats } from './backtest';
import { dailyMarket, dailySeed, REGIMES, type RegimeKey } from './market';
import { runBot } from './research';
import { STRATS, defaultParams } from './strategies';

export const ARCHIVE_FROM = '2010-08-03';
export const ARCHIVE_TO = '2011-03-14';

/** Days he flagged by hand. They say nothing about the data. */
const MARKS: Record<string, string> = {
  '2010-08-03': 'first day live. nobody played it. that is fine.',
  '2010-12-02': 'i thought this one repeated. it does not.',
  '2011-02-26': 'ordered the geobaskets. the tape did not care.',
  '2011-03-05': 'she called. i did not answer.',
  '2011-03-07': 'they arrived. the tape still did not care.',
  '2011-03-14': 'it is in this one.',
};

export interface ArchiveRow {
  day: string;
  seed: number;
  /** The regimes you could trade through, in order, with how many days each lasted. */
  shape: { k: RegimeKey; days: number }[];
  /** Trading day the first crash begins, or null if there is none. */
  firstCrash: number | null;
  /** Its length in bars, or null if there is no crash or the tape ended inside it. */
  crashLen: number | null;
  hold: number;
  best: { call: string; ret: number };
  note: string | null;
}

/** Every date from `from` to `to`, inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(from); t <= Date.parse(to); t += 864e5) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** How many days back a repeated first-crash day still catches his eye. */
const NOTICE = 30;

export function archiveRows(days: readonly string[] = daysBetween(ARCHIVE_FROM, ARCHIVE_TO)): ArchiveRow[] {
  const bots = STRATS.filter((S) => S.id !== 'bh');
  const rows = days.map((day): ArchiveRow => {
    const m = dailyMarket(day);
    const shape = m.regimes!
      .filter((s) => s.to >= m.warm - 1)
      .map((s) => ({ k: s.k, days: Math.min(s.to, m.n - 1) - Math.max(s.from, m.warm - 1) + 1 }));
    const crash = m.regimes!.find((s) => s.k === 'crash' && s.from >= m.warm);
    const results = bots.map((S) => ({ call: S.call, ret: runBot(S, m, defaultParams(S)).st.ret }));
    return {
      day,
      seed: dailySeed(day),
      shape,
      firstCrash: crash ? crash.from - m.warm + 1 : null,
      crashLen: crash && crash.to < m.n - 1 ? crash.to - crash.from + 1 : null,
      hold: stats(backtest(m.closes.map(() => 1), m).eq).ret,
      best: results.reduce((a, b) => (b.ret > a.ret ? b : a)),
      note: null,
    };
  });

  const longest = Math.max(0, ...rows.map((r) => r.crashLen ?? 0));
  const holds = rows.map((r) => r.hold);
  const [bestHold, worstHold] = [Math.max(...holds), Math.min(...holds)];

  rows.forEach((row, i) => {
    const recent = rows.slice(Math.max(0, i - NOTICE), i).map((r) => r.firstCrash);
    const quietRun = i >= 2 && rows[i].firstCrash == null && rows[i - 1].firstCrash == null && rows[i - 2].firstCrash == null;
    if (MARKS[row.day]) row.note = MARKS[row.day];
    else if (longest > 0 && row.crashLen === longest) row.note = `longest crash i logged: ${longest} bars. it was never 11.`;
    else if (row.firstCrash != null && recent.includes(row.firstCrash)) row.note = `← ${row.firstCrash}. AGAIN.`;
    else if (quietRun) row.note = 'three days with no crash. i do not trust it.';
    else if (row.hold === bestHold) row.note = 'the best day for standing still.';
    else if (row.hold === worstHold) row.note = 'the worst day for standing still.';
  });
  return rows;
}

/** A short label for a regime in the shape column. */
export const shapeWord = (k: RegimeKey): string => REGIMES[k].label.split(/[ -]/)[0].toUpperCase();
