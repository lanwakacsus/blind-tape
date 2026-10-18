import { describe, expect, it } from 'vitest';
import { LEVELS, genMarket, mulberry32 } from '../src/engine/market';
import { addLeaks, makeWire } from '../src/engine/news';
import { STRATS } from '../src/engine/strategies';
import { ASIDES, ENTRIES, LATE_LEAK, asideFor, body, leakLines, newlyUnlocked, randomEntry, stamp, unlocked } from '../src/game/diary';

describe('diary', () => {
  it('brings the rest back in order as rounds finish', () => {
    const later = ENTRIES.map((e) => e.rounds).filter((r) => r > 0);
    expect(later).toEqual([...later].sort((a, b) => a - b));
  });

  it('has his last dated note and two early ones on the page from the start', () => {
    const start = unlocked(0);
    expect(start).toHaveLength(3);
    expect(start.at(-1)!.when).toBe('14 MAR 2011 03:17');
    expect(unlocked(1).length).toBeGreaterThan(start.length);
    expect(unlocked(1000)).toHaveLength(ENTRIES.length);
  });

  it('reports exactly the entries a round brings back', () => {
    const found = newlyUnlocked(0, 3);
    expect(found.map((e) => e.rounds)).toEqual([1, 2, 3]);
    expect(newlyUnlocked(3, 3)).toEqual([]);
  });

  it('picks a found entry for the quiet moments', () => {
    expect(unlocked(0)).toContain(randomEntry(0));
    expect(randomEntry(0, () => 0)).toBe(unlocked(0)[0]);
  });

  it('gives each entry its date and its words, as written', () => {
    expect(stamp(ENTRIES[0])).toBe('03 AUG 2010');
    expect(body(ENTRIES[0])).toBe(ENTRIES[0].text);
    expect(ENTRIES.some((e) => e.when === 'now' || e.text.includes('{n}'))).toBe(false);
  });

  it('keeps its one late message for when a great deal has been done', () => {
    expect(leakLines(LATE_LEAK.rounds - 1)).not.toContain(LATE_LEAK.text);
    expect(leakLines(LATE_LEAK.rounds)).toContain(LATE_LEAK.text);
  });

  it('leaks one line from the very first round and more as the notes come back', () => {
    expect(leakLines(0)).toEqual(['THE SEED IS NOT A SEED']);
    expect(leakLines(3).length).toBeGreaterThan(leakLines(0).length);
  });

  it('gives every bot an aside, each at a different point', () => {
    expect(new Set(STRATS.map((S) => ASIDES[S.id].rounds)).size).toBe(STRATS.length);
    expect(asideFor('sma', 0)).toBeNull();
    expect(asideFor('bh', 8)).toMatch(/envy/);
  });
});

describe('addLeaks', () => {
  const m = genMarket(4242, LEVELS[1]);
  const wire = makeWire(m, 0.2);
  const lines = leakLines(1000);

  it('changes nothing when there is nothing to leak', () => {
    expect(addLeaks(wire, m, [], Math.random)).toBe(wire);
  });

  it('adds flagged lines that are never followed, inside the tradable window', () => {
    const out = addLeaks(wire, m, lines, mulberry32(9));
    const added = out.filter((h) => h.diary);
    expect(added.length).toBeGreaterThan(0);
    expect(out).toHaveLength(wire.length + added.length);
    added.forEach((h) => {
      expect(h.followed).toBe(false);
      expect(h.at).toBeGreaterThan(m.warm);
      expect(h.at).toBeLessThanOrEqual(m.n - 2);
      expect(lines).toContain(h.text);
    });
    expect(new Set(added.map((h) => h.at)).size).toBe(added.length);
    expect(out.map((h) => h.at)).toEqual([...out.map((h) => h.at)].sort((a, b) => a - b));
  });

  it('leaks more as more has been found, up to three', () => {
    const n = (count: number) => addLeaks([], m, lines.slice(0, count), mulberry32(1)).length;
    expect(n(1)).toBe(1);
    expect(n(3)).toBe(2);
    expect(n(8)).toBe(3);
    expect(n(11)).toBe(4);
  });

  it('works on a tape with no regime schedule', () => {
    const csv = { ...m, regimes: null };
    expect(addLeaks(makeWire(csv, 0.3), csv, lines, mulberry32(2)).every((h) => h.diary)).toBe(true);
  });
});
