import { describe, expect, it } from 'vitest';
import { backtest, stats } from '../src/engine/backtest';
import { genMarket, makeMarket, type Market } from '../src/engine/market';
import { STRATS, defaultParams, rsi, sma, type Params } from '../src/engine/strategies';
import legacy from './fixtures/legacy-engine.json';

const variants = (params: Params): [string, Params][] => [
  ['default', params],
  ['short', { ...params, short: true }],
];

describe('indicators', () => {
  it('sma averages the last n values and is null before that', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it('rsi is 100 with no losses and 0 with no gains', () => {
    expect(rsi([1, 2, 3, 4, 5], 3).slice(3)).toEqual([100, 100]);
    expect(rsi([5, 4, 3, 2, 1], 3).slice(3)).toEqual([0, 0]);
    expect(rsi([5, 4, 3, 2, 1], 3).slice(0, 3)).toEqual([null, null, null]);
  });
});

describe('strategies', () => {
  const base = genMarket(4242);

  it('have no look-ahead: changing bars after t never changes pos[t]', () => {
    for (const t of [70, 120, 180]) {
      // Replace everything after t with a different random tape, rescaled to join at t.
      const other = genMarket(777);
      const k = base.bars[t].c / other.bars[t].c;
      const bars = base.bars.map((b, i) =>
        i <= t ? b : { o: other.bars[i].o * k, h: other.bars[i].h * k, l: other.bars[i].l * k, c: other.bars[i].c * k },
      );
      const changed: Market = makeMarket({ ...base, bars });
      expect(changed.closes.slice(t + 1)).not.toEqual(base.closes.slice(t + 1));

      for (const S of STRATS) {
        for (const [, p] of variants(defaultParams(S))) {
          const a = S.run(base.closes, p, base.bars);
          const b = S.run(changed.closes, p, changed.bars);
          expect(b.slice(0, t + 1), `${S.id} at t=${t}`).toEqual(a.slice(0, t + 1));
        }
      }
    }
  });

  it('only ever return -1, 0 or 1, and stay flat or long unless shorting is enabled', () => {
    for (const S of STRATS) {
      for (const [tag, p] of variants(defaultParams(S))) {
        const pos = S.run(base.closes, p, base.bars);
        expect(pos).toHaveLength(base.n);
        const allowed = tag === 'short' || S.id === 'bh' ? [-1, 0, 1] : [0, 1];
        expect(pos.every((x) => allowed.includes(x)), `${S.id}:${tag}`).toBe(true);
      }
    }
  });

  it('reproduce the original build on reference markets', () => {
    for (const c of legacy.markets) {
      const m = genMarket(c.seed, c.opts);
      for (const S of STRATS) {
        for (const [tag, p] of variants(defaultParams(S))) {
          const ref = c.strats[`${S.id}:${tag}` as keyof typeof c.strats];
          const pos = S.run(m.closes, p, m.bars);
          const r = backtest(pos, m);
          expect(pos, `${S.id}:${tag}`).toEqual(ref.pos);
          expect(r.trades).toBe(ref.trades);
          expect(r.exposure).toBe(ref.exposure);
          expect(r.eq[r.eq.length - 1]).toBe(ref.eqLast);
          expect(stats(r.eq)).toEqual({ ret: ref.ret, sharpe: ref.sharpe, dd: ref.dd });
        }
      }
    }
  });
});
