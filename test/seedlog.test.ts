import { describe, expect, it } from 'vitest';
import { dailySeed } from '../src/engine/market';
import { lastDays, seedLog } from '../src/engine/seedlog';

describe('lastDays', () => {
  it('counts back from today, oldest first, across month ends', () => {
    expect(lastDays('2011-03-02', 4)).toEqual(['2011-02-27', '2011-02-28', '2011-03-01', '2011-03-02']);
  });
});

describe('seedLog', () => {
  const days = lastDays('2011-03-14', 30);
  const rows = seedLog(days);

  it('uses the real daily seeds and is deterministic', () => {
    expect(rows.map((r) => r.seed)).toEqual(days.map(dailySeed));
    expect(seedLog(days)).toEqual(rows);
  });

  it('marks a first-crash day that has come up before, and only those', () => {
    const seen = new Set<number>();
    rows.slice(0, -1).forEach((r) => {
      const repeat = r.firstCrash != null && seen.has(r.firstCrash);
      expect(!!r.note?.includes('AGAIN')).toBe(repeat);
      if (r.firstCrash != null) seen.add(r.firstCrash);
    });
  });

  it('writes about days with no crash, and about today', () => {
    expect(rows.some((r) => r.firstCrash == null)).toBe(true);
    rows.slice(0, -1).filter((r) => r.firstCrash == null).forEach((r) => expect(r.note).toMatch(/none/));
    expect(rows.at(-1)!.note).toMatch(/TODAY/);
  });
});
