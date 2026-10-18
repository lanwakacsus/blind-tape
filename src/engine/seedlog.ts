/* The author's seed log: for each recent daily tape, its seed and the day its first crash
 * begins, with his notes on what he thinks the numbers mean. The numbers are real; the
 * pattern he sees in them is not. Pure: no DOM. */

import { dailyMarket, dailySeed } from './market';

export interface SeedRow {
  day: string;
  seed: number;
  /** Trading day (1-based) on which the first crash begins, or null if there is none. */
  firstCrash: number | null;
  /** What he wrote beside it. */
  note: string | null;
}

/** The `n` UTC dates ending on `today` (YYYY-MM-DD), oldest first. */
export function lastDays(today: string, n: number): string[] {
  const [y, m, d] = today.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(y, m - 1, d - (n - 1 - i))).toISOString().slice(0, 10));
}

export function seedLog(days: readonly string[]): SeedRow[] {
  const seen = new Set<number>();
  return days.map((day, i) => {
    const m = dailyMarket(day);
    const crash = m.regimes!.find((s) => s.k === 'crash' && s.from >= m.warm);
    const firstCrash = crash ? crash.from - m.warm + 1 : null;
    let note: string | null = null;
    if (firstCrash == null) note = 'none. i do not trust it.';
    else if (seen.has(firstCrash)) note = `← ${firstCrash}. AGAIN.`;
    if (firstCrash != null) seen.add(firstCrash);
    if (i === days.length - 1) note = '← TODAY. I HAVE ALREADY WATCHED IT.';
    return { day, seed: dailySeed(day), firstCrash, note };
  });
}
