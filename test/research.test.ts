import { describe, expect, it } from 'vitest';
import { genMarket } from '../src/engine/market';
import { agreement, runBots, snapshotTuning, tuningCheck, type LabSettings } from '../src/engine/research';
import { STRATS, defaultParams, type Position } from '../src/engine/strategies';

const defaults = (): LabSettings =>
  Object.fromEntries(STRATS.map((S) => [S.id, { on: true, params: defaultParams(S) }])) as LabSettings;

describe('agreement', () => {
  const m = genMarket(7);
  const same: Position[] = new Array(m.n).fill(1);

  it('is 1 for identical series and 0 for opposite ones', () => {
    expect(agreement(same, same, m)).toBe(1);
    expect(agreement(same, same.map((p) => (-p) as Position), m)).toBe(0);
  });

  it('ignores bars outside the tradable window', () => {
    const noisy = same.map((p, t) => (t < m.warm - 1 ? (-p as Position) : p));
    expect(agreement(same, noisy, m)).toBe(1);
  });
});

describe('tuning check', () => {
  const tuned = genMarket(11);
  const hidden = genMarket(12);

  it('snapshots only enabled bots, always keeping buy & hold', () => {
    const lab = defaults();
    lab.sma.on = false;
    lab.bh.on = false;
    const ids = snapshotTuning(runBots(tuned, lab), lab).bots.map((b) => b.id);
    expect(ids).toContain('bh');
    expect(ids).not.toContain('sma');
  });

  it('flags only bots whose settings differ from the defaults', () => {
    const lab = defaults();
    lab.sma.params = { ...lab.sma.params, fast: 3 };
    const rows = tuningCheck(snapshotTuning(runBots(tuned, lab), lab), hidden);
    expect(rows.filter((r) => r.tuned).map((r) => r.S.id)).toEqual(['sma']);
  });

  it('scores the frozen settings on the hidden tape, even if the lab changes later', () => {
    const lab = defaults();
    const snap = snapshotTuning(runBots(tuned, lab), lab);
    lab.mom.params = { ...lab.mom.params, look: 3 };
    const rows = tuningCheck(snap, hidden);
    const expected = runBots(hidden, defaults());
    rows.forEach((r) => expect(r.after).toBeCloseTo(expected.find((b) => b.S.id === r.S.id)!.st.ret, 12));
  });
});
