import { describe, expect, it } from 'vitest';
import { CLAIMS, FULL, SAMPLES, truthOf } from '../src/engine/claims';

const byId = (id: string) => CLAIMS.find((c) => c.id === id)!;

describe('claims', () => {
  it('has unique ids and a mix of true and false', () => {
    expect(new Set(CLAIMS.map((c) => c.id)).size).toBe(CLAIMS.length);
    const truths = CLAIMS.map(truthOf);
    expect(truths.filter(Boolean).length).toBeGreaterThanOrEqual(3);
    expect(truths.filter((t) => !t).length).toBeGreaterThanOrEqual(3);
  });

  it('judges each claim the way the engine behaves', () => {
    const expected: Record<string, boolean> = {
      crash: true,
      fees: true,
      wire: true,
      hold: true,
      cross: false,
      tuned: false,
      repeat: false,
      short: false,
      dailycrash: false,
    };
    for (const c of CLAIMS) expect([c.id, truthOf(c)]).toEqual([c.id, expected[c.id]]);
  });

  it('is deterministic and always shows evidence', () => {
    for (const c of CLAIMS) {
      const a = c.evaluate(SAMPLES[0]);
      expect(a).toEqual(c.evaluate(SAMPLES[0]));
      expect(a.evidence.length).toBeGreaterThan(0);
    }
  });

  it('lets a small sample mislead: ten markets say CROSS beats buy & hold, three hundred say it does not', () => {
    expect(byId('cross').evaluate(SAMPLES[0]).holds).toBe(true);
    expect(byId('cross').evaluate(FULL).holds).toBe(false);
  });

  it('shows the tuning collapse at every sample size', () => {
    for (const n of SAMPLES) expect(byId('tuned').evaluate(n).holds).toBe(false);
  });

  it('prices forty trades at about four percent', () => {
    expect(byId('fees').evaluate(10).evidence[1]).toMatch(/Cost: 3\.9\d%/);
  });
});
