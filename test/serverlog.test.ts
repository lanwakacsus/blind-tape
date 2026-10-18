import { describe, expect, it } from 'vitest';
import { LOG_STARTS, accessLines, accessLog, lastRunAt, tomorrowStart } from '../src/game/serverlog';

const at = (iso: string) => new Date(iso);

describe('accessLog', () => {
  const now = at('2026-10-17T16:52:00Z');
  const lines = accessLog(now).split('\n');

  it('is one address and one bot, asking for tomorrow every night', () => {
    const body = lines.slice(1);
    expect(body).toHaveLength(30);
    for (const l of body) {
      expect(l).toMatch(/^192\.0\.2\.17 - - \[\d{2}\/[A-Z][a-z]{2}\/\d{4}:03:17:0\d \+0000\] "GET \/tomorrow HTTP\/1\.1" 404 312 "-" "m\.bot\/1\.4"$/);
    }
  });

  it('ends on a line for tomorrow, which has not happened yet', () => {
    expect(lines.at(-1)).toContain('[18/Oct/2026:03:17:');
    expect(lines.at(-2)).toContain('[17/Oct/2026:03:17:');
    expect(Date.UTC(2026, 9, 18, 3, 17)).toBeGreaterThan(now.getTime());
  });

  it('counts back thirty nights, one line each, with no gaps', () => {
    expect(lines[1]).toContain('[19/Sep/2026:03:17:');
    const days = lines.slice(1).map((l) => Number(l.match(/\[(\d{2})\//)![1]));
    for (let i = 1; i < days.length; i++) expect([1, days[i - 1] + 1]).toContain(days[i]);
  });

  it('says how many lines there are, and how many were rotated away', () => {
    const total = accessLines(now);
    expect(total).toBe(Math.round((Date.UTC(2026, 9, 18) - LOG_STARTS) / 864e5) + 1);
    expect(lines[0]).toContain(`the last 30 of ${total.toLocaleString('en-US')} lines`);
    expect(lines[0]).toContain(`the earlier ${(total - 30).toLocaleString('en-US')} were rotated away`);
  });

  it('starts on the night after his last note, whatever day it is read', () => {
    const early = accessLog(at('2011-03-20T12:00:00Z'), 100).split('\n');
    expect(early[1]).toContain('[15/Mar/2011:03:17:');
    expect(early.at(-1)).toContain('[21/Mar/2011:03:17:');
    expect(early).toHaveLength(8);
  });

  it('crosses a year end and a leap day cleanly', () => {
    expect(accessLog(at('2027-01-01T01:00:00Z'), 3)).toContain('[31/Dec/2026:03:17:');
    expect(accessLog(at('2028-02-28T01:00:00Z'), 3)).toContain('[29/Feb/2028:03:17:');
  });
});

describe('lastRunAt', () => {
  it('is the most recent 03:17 UTC that has happened', () => {
    expect(lastRunAt(at('2026-10-17T16:52:00Z')).toISOString()).toBe('2026-10-17T03:17:00.000Z');
    expect(lastRunAt(at('2026-10-17T02:00:00Z')).toISOString()).toBe('2026-10-16T03:17:00.000Z');
    expect(tomorrowStart(at('2026-10-17T23:59:59Z'))).toBe(Date.UTC(2026, 9, 18));
  });
});
