import { describe, expect, it } from 'vitest';
import { ARCHIVE_FROM, ARCHIVE_TO, archiveRows, daysBetween, shapeWord } from '../src/engine/archive';
import { dailyMarket, dailySeed } from '../src/engine/market';

describe('daysBetween', () => {
  it('is inclusive, in order, and crosses month and year ends', () => {
    expect(daysBetween('2010-12-30', '2011-01-02')).toEqual(['2010-12-30', '2010-12-31', '2011-01-01', '2011-01-02']);
    expect(daysBetween('2011-03-14', '2011-03-14')).toEqual(['2011-03-14']);
  });
});

describe('archiveRows', () => {
  const rows = archiveRows();

  it('covers every day from launch to his last night', () => {
    expect(rows).toHaveLength(224);
    expect(rows[0].day).toBe(ARCHIVE_FROM);
    expect(rows[rows.length - 1].day).toBe(ARCHIVE_TO);
  });

  it('is built from the real daily tapes', () => {
    for (const r of [rows[0], rows[100], rows[223]]) {
      const m = dailyMarket(r.day);
      expect(r.seed).toBe(dailySeed(r.day));
      expect(r.shape.reduce((a, s) => a + s.days, 0)).toBe(m.n - m.warm + 1);
    }
  });

  it('reports the first crash day truthfully', () => {
    for (const r of rows.slice(0, 40)) {
      const m = dailyMarket(r.day);
      const crash = m.regimes!.find((s) => s.k === 'crash' && s.from >= m.warm);
      expect(r.firstCrash).toBe(crash ? crash.from - m.warm + 1 : null);
    }
  });

  it('never calls a crash longer than ten bars', () => {
    expect(Math.max(...rows.map((r) => r.crashLen ?? 0))).toBeLessThanOrEqual(10);
  });

  it('only writes notes the data supports', () => {
    const longest = Math.max(...rows.map((r) => r.crashLen ?? 0));
    for (const r of rows) {
      if (r.note?.startsWith('longest crash')) expect(r.crashLen).toBe(longest);
      if (r.note?.includes('AGAIN')) expect(r.firstCrash).not.toBeNull();
      if (r.note?.startsWith('three days')) expect(r.firstCrash).toBeNull();
    }
    expect(rows.filter((r) => r.note?.startsWith('longest crash'))).not.toHaveLength(0);
  });

  it('keeps the dates he marked by hand', () => {
    expect(rows.find((r) => r.day === '2011-03-14')!.note).toBe('it is in this one.');
    expect(rows.find((r) => r.day === '2010-12-02')!.note).toMatch(/repeated/);
  });

  it('names the best bot among the five that can lose', () => {
    expect(['CROSS', 'MOMO', 'BREAK', 'SNAP', 'BANDS']).toContain(rows[10].best.call);
  });

  it('is deterministic', () => {
    expect(archiveRows(['2011-01-05', '2011-01-06'])).toEqual(archiveRows(['2011-01-05', '2011-01-06']));
  });
});

describe('shapeWord', () => {
  it('shortens regime names for the table', () => {
    expect(shapeWord('melt')).toBe('MELT');
    expect(shapeWord('grind')).toBe('GRIND');
  });
});
