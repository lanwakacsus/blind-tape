import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/engine/market';
import { OMENS, bootLines, isLate, lastSeen, verdict } from '../src/game/lore';

describe('lore', () => {
  it('has one note per season market', () => {
    expect(OMENS).toHaveLength(LEVELS.length);
  });

  it('reads the round correctly', () => {
    expect(verdict({ ret: 0, bhRet: 0.1, trades: 0 })).toMatch(/NOTHING/);
    expect(verdict({ ret: 0.2, bhRet: 0.1, trades: 4 })).toMatch(/BEAT THE TAPE/);
    expect(verdict({ ret: 0.05, bhRet: 0.1, trades: 4 })).toMatch(/HOLDING/);
    expect(verdict({ ret: -0.05, bhRet: 0.1, trades: 20 })).toMatch(/20 TRADES/);
    expect(verdict({ ret: -0.05, bhRet: 0.1, trades: 3 })).toMatch(/DOES NOT CARE/);
  });

  it('words elapsed time plainly', () => {
    expect(lastSeen(10_000)).toBe('moments ago');
    expect(lastSeen(60_000)).toBe('1 minute ago');
    expect(lastSeen(3 * 3600_000)).toBe('3 hours ago');
    expect(lastSeen(3 * 86400_000)).toBe('3 days ago');
  });

  it('greets a first visit and a return differently', () => {
    expect(bootLines({ visits: 1, sinceLast: null })[0]).toBe('Welcome, visitor. Please do not share this address.');
    expect(bootLines({ visits: 4, sinceLast: 2 * 86400_000 })[0]).toContain('Visit 4. You were last here 2 days ago');
  });

  it('is 3 AM only for the 3 o\u2019clock hour, and then he says so first', () => {
    expect(isLate(new Date(2026, 9, 17, 3, 0))).toBe(true);
    expect(isLate(new Date(2026, 9, 17, 3, 59))).toBe(true);
    expect(isLate(new Date(2026, 9, 17, 2, 59))).toBe(false);
    expect(isLate(new Date(2026, 9, 17, 4, 0))).toBe(false);
    expect(bootLines({ visits: 1, sinceLast: null, late: true })[0]).toMatch(/3 am/);
    expect(bootLines({ visits: 1, sinceLast: null })[0]).toBe('Welcome, visitor. Please do not share this address.');
  });
});
