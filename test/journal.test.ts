import { describe, expect, it } from 'vitest';
import { habits, lifetime, type JournalEntry } from '../src/game/journal';

let ts = 0;
const entry = (o: Partial<JournalEntry> = {}): JournalEntry => ({
  ts: ts++,
  mode: 'season',
  market: 'Market 1',
  lvl: 0,
  ret: 0.05,
  bhRet: 0.1,
  dd: -0.1,
  sharpe: 1,
  grade: 'B',
  trades: 6,
  winRate: 0.5,
  expectancy: 0.01,
  profitFactor: 1.2,
  fees: 0.01,
  stops: 0,
  stopUsed: false,
  ...o,
});

describe('lifetime', () => {
  const es = [entry({ ret: 0.2, bhRet: 0.1, grade: 'A' }), entry({ ret: -0.1, bhRet: 0.05, grade: 'F' }), entry({ ret: 0.05, bhRet: 0.1, grade: 'B' })];
  const lt = lifetime(es);

  it('counts profitable rounds and rounds that beat holding', () => {
    expect([lt.rounds, lt.profitable, lt.beatHold]).toEqual([3, 2, 1]);
  });

  it('averages returns, grades and picks the extremes', () => {
    expect(lt.avgRet).toBeCloseTo(0.05 / 3 * 1 + 0.2 / 3 - 0.1 / 3 + 0.05 / 3 - 0.05 / 3, 10);
    expect(lt.gpa).toBeCloseTo((4 + 0 + 3) / 3, 12);
    expect(lt.best!.ret).toBe(0.2);
    expect(lt.worst!.ret).toBe(-0.1);
  });

  it('weights win rate and expectancy by how many trades each round had', () => {
    const l = lifetime([entry({ trades: 10, winRate: 0.6, expectancy: 0.02 }), entry({ trades: 2, winRate: 0, expectancy: -0.05 })]);
    expect(l.trades).toBe(12);
    expect(l.winRate).toBeCloseTo(6 / 12, 12);
    expect(l.expectancy).toBeCloseTo((0.2 - 0.1) / 12, 12);
  });

  it('copes with an empty journal', () => {
    const l = lifetime([]);
    expect([l.rounds, l.avgRet, l.winRate, l.best, l.gpa]).toEqual([0, 0, 0, null, 0]);
  });

  it('ranks markets by how you did on them', () => {
    const l = lifetime([entry({ market: 'A', ret: 0.1 }), entry({ market: 'B', ret: -0.1 }), entry({ market: 'A', ret: 0.2 })]);
    expect(l.byMarket.map((m) => m.market)).toEqual(['A', 'B']);
    expect(l.byMarket[0]).toMatchObject({ n: 2 });
  });
});

describe('habits', () => {
  it('asks for more rounds before saying anything', () => {
    expect(habits([entry(), entry()]).join(' ')).toMatch(/Play a few more rounds. I cannot tell anything from one/);
  });

  it('spots trading harder after a loss', () => {
    const es = Array.from({ length: 10 }, (_, i) => entry(i % 2 ? { ret: 0.05, trades: 20 } : { ret: -0.05, trades: 4 }));
    expect(habits(es).join(' ')).toMatch(/After a losing round you averaged 20 trades. After a winning one, 4. I did that/);
  });

  it('notices that stops cut the worst drawdown', () => {
    const es = [...Array.from({ length: 3 }, () => entry({ stopUsed: true, dd: -0.04 })), ...Array.from({ length: 3 }, () => entry({ stopUsed: false, dd: -0.2 }))];
    expect(habits(es).join(' ')).toMatch(/shallower worst drawdown/);
  });

  it('says plainly when you rarely beat holding', () => {
    const es = Array.from({ length: 6 }, () => entry({ ret: 0.01, bhRet: 0.1 }));
    expect(habits(es).join(' ')).toMatch(/beat buy and hold in 0 of 6 rounds/);
  });

  it('prices the fees across rounds', () => {
    const es = Array.from({ length: 6 }, () => entry({ fees: 0.02, ret: 0.2, bhRet: 0.1 }));
    expect(habits(es).join(' ')).toMatch(/fees have taken \+12\.0%/);
  });

  it('never gives more than four', () => {
    const es = Array.from({ length: 12 }, (_, i) => entry({ ret: i % 2 ? 0.01 : -0.05, bhRet: 0.1, trades: i % 2 ? 3 : 25, fees: 0.03, stopUsed: i < 6, dd: i < 6 ? -0.03 : -0.2, market: i % 3 ? 'A' : 'B' }));
    expect(habits(es).length).toBeLessThanOrEqual(4);
  });
});
