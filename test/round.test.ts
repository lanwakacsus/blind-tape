// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FEE } from '../src/engine/backtest';
import { genMarket, makeMarket, type Market } from '../src/engine/market';
import { advance, game, goLive, setPos, setRoundView, setSize, setStop, setTarget, startRound, type Round, type RoundView } from '../src/game/round';
import { save } from '../src/game/save';
import { riskGrade } from '../src/game/scoring';

const view = (): RoundView => ({
  started: vi.fn(),
  positionChanged: vi.fn(),
  barClosed: vi.fn(),
  callout: vi.fn(),
  headline: vi.fn(),
  comment: vi.fn(),
  shake: vi.fn(),
  float: vi.fn(),
  finished: vi.fn(),
});

/** A tape that falls 3% every bar. */
function falling(): Market {
  const bars = Array.from({ length: 80 }, (_, i) => {
    const c = 100 * 0.97 ** i;
    const o = i ? 100 * 0.97 ** (i - 1) : c;
    return { o, h: o, l: c, c };
  });
  return makeMarket({ bars, warm: 20, seed: null, regimes: null, opts: {} });
}

/** A tape that rises 1% every bar. */
function rising(): Market {
  const bars = Array.from({ length: 100 }, (_, i) => {
    const o = 100 * 1.01 ** (i - 1 < 0 ? 0 : i - 1);
    const c = 100 * 1.01 ** i;
    return { o, h: c, l: o, c };
  });
  return makeMarket({ bars, warm: 20, seed: null, regimes: null, opts: {} });
}

/** Runs the clock until `done`, or a safety limit. */
function run(r: Round, done: () => boolean, ms = 6000): void {
  for (let t = 0; t < ms && !done(); t += 16) advance(r, t);
}

function live(lvl: number | null = null, m: Market = genMarket(7)): Round {
  startRound(m, lvl, lvl == null ? 'practice' : 'season');
  const r = game.round!;
  goLive(r);
  return r;
}

let v: RoundView;
afterEach(() => vi.restoreAllMocks());
beforeEach(() => {
  v = view();
  setRoundView(v);
});

describe('position size', () => {
  it('charges the fee only on the size traded', () => {
    const r = live();
    setSize(0.5);
    setPos(1);
    expect(r.pos).toBe(0.5);
    expect(r.e).toBeCloseTo(1 - FEE * 0.5, 12);
  });

  it('resizes an open position without scoring a trade', () => {
    const r = live();
    setSize(0.25);
    setPos(1);
    setSize(1);
    expect(r.pos).toBe(1);
    expect(r.closed).toBe(0);
    expect(r.entryE).toBeCloseTo(1 - FEE * 0.25, 12);
    expect(r.e).toBeCloseTo((1 - FEE * 0.25) * (1 - FEE * 0.75), 12);
  });

  it('scores a trade when the direction flips', () => {
    const r = live();
    setPos(1);
    setPos(-1);
    expect(r.closed).toBe(1);
    expect(r.pos).toBe(-1);
  });
});

describe('stop-loss', () => {
  it('closes a losing long once the loss reaches the stop', () => {
    const r = live(null, falling());
    setStop(0.02);
    setPos(1);
    for (let t = 0; t < 4000 && r.stops === 0; t += 16) advance(r, t);
    expect(r.stops).toBe(1);
    expect(r.pos).toBe(0);
    expect(r.trades.at(-1)!.stopped).toBe(true);
    expect(r.e / r.entryE - 1).toBeLessThan(0);
  });

  it('does not fire with the stop off', () => {
    const r = live(null, falling());
    setPos(1);
    for (let t = 0; t < 1500; t += 16) advance(r, t);
    expect(r.stops).toBe(0);
    expect(r.pos).toBe(1);
  });
});

describe('market rules', () => {
  it('stops new positions once the trade cap is used, but never blocks going flat', () => {
    const r = live(2);
    for (let i = 0; i < 12; i++) setPos(i % 2 ? -1 : 1);
    expect(r.nTrades).toBe(12);
    const before = r.pos;
    setPos(1);
    expect(r.pos).toBe(before);
    expect(v.callout).toHaveBeenCalledWith('NO TRADES LEFT', 'down');
    setPos(0);
    expect(r.pos).toBe(0);
  });

  it('locks the stop on when the market says so', () => {
    const r = live(3);
    expect(r.stop).toBe(0.05);
    setStop(0);
    expect(r.stop).toBe(0.05);
  });

  it('caps the size when the market says so', () => {
    const r = live(4);
    expect(r.size).toBe(0.5);
    setSize(1);
    expect(r.size).toBe(0.5);
    setPos(1);
    expect(r.pos).toBe(0.5);
  });
});

describe('M.', () => {
  it('races on every tape and reveals his equity one bar at a time', () => {
    const r = live();
    expect(r.ghost.eq).toHaveLength(r.m.n - r.m.warm + 1);
    expect(r.ghost.stage).toBe(r.stage);
  });

  it('becomes the all-seeing version at the last stage', () => {
    const saved = save.rounds;
    try {
      save.rounds = 0;
      expect(live().stage).toBeLessThanOrEqual(1);
      save.rounds = 40;
      expect(live().stage).toBe(3);
    } finally {
      save.rounds = saved;
    }
  });

  it('remarks when you lose money on a trade, and not on every trade', () => {
    const r = live(null, falling());
    setPos(-1);
    const said = (v.comment as ReturnType<typeof vi.fn>).mock.calls.length;
    setPos(0);
    expect((v.comment as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(said + 1);
    expect(r.lastSaid).toBeGreaterThan(-99);
  });

  it('remarks on the stop-loss firing, however recently he spoke', () => {
    const r = live(null, falling());
    setStop(0.02);
    setPos(1);
    for (let t = 0; t < 4000 && r.stops === 0; t += 16) advance(r, t);
    expect(v.comment).toHaveBeenCalled();
  });

  it('counts the drawdown once per level', () => {
    const r = live(null, falling());
    setPos(1);
    for (let t = 0; t < 12000 && r.phase === 'run'; t += 16) advance(r, t);
    expect(new Set(r.dd).size).toBe(r.dd.length);
    expect(r.dd.length).toBeGreaterThan(0);
  });
});

describe('the get-set stage', () => {
  it('starts with nothing moving, but lets you trade and set up', () => {
    startRound(genMarket(7), null, 'practice');
    const r = game.round!;
    expect(r.phase).toBe('ready');
    for (let t = 0; t < 2000; t += 16) advance(r, t);
    expect(r.bar).toBe(r.m.warm - 1);
    expect(r.prog).toBe(0);
    setSize(0.5);
    setStop(0.05);
    setTarget(0.06);
    setPos(1);
    expect([r.size, r.stop, r.target, r.pos]).toEqual([0.5, 0.05, 0.06, 0.5]);
    expect(r.phase).toBe('ready');
  });

  it('carries a position taken while getting set into the first bar', () => {
    startRound(genMarket(7), null, 'practice');
    const r = game.round!;
    setPos(-1);
    goLive(r);
    expect(r.posBars[r.m.warm - 1]).toBe(-1);
    expect(r.phase).toBe('run');
  });
});

describe('profit target', () => {
  it('closes a winning trade once it has made the target', () => {
    const r = live(null, rising());
    setTarget(0.05);
    setPos(1);
    run(r, () => r.pos === 0 && r.closedTrades.length > 0);
    expect(r.pos).toBe(0);
    expect(r.closedTrades).toHaveLength(1);
    const t = r.closedTrades[0];
    expect(t.via).toBe('target');
    // The target is measured before the exit fee, so the trade nets a little under it.
    expect(t.pnl).toBeGreaterThan(0.05 - 2 * FEE);
    expect(t.pnl).toBeLessThan(0.08);
    expect(v.callout).toHaveBeenCalledWith(expect.stringMatching(/^TARGET HIT/), 'gold');
  });

  it('does nothing while it is off', () => {
    const r = live(null, rising());
    setPos(1);
    run(r, () => r.bar >= r.m.warm + 12);
    expect(r.pos).toBe(1);
    expect(r.closedTrades).toHaveLength(0);
  });

  it('works with a stop as a bracket: whichever is reached first closes the trade', () => {
    const down = live(null, falling());
    setStop(0.05);
    setTarget(0.1);
    setPos(1);
    run(down, () => down.closedTrades.length > 0);
    expect(down.closedTrades[0].via).toBe('stop-loss');

    const up = live(null, rising());
    setStop(0.1);
    setTarget(0.05);
    setPos(1);
    run(up, () => up.closedTrades.length > 0);
    expect(up.closedTrades[0].via).toBe('target');
  });

  it('works on a short too', () => {
    const r = live(null, falling());
    setTarget(0.05);
    setPos(-1);
    run(r, () => r.closedTrades.length > 0);
    expect(r.closedTrades[0]).toMatchObject({ dir: -1, via: 'target' });
  });

  it('is not locked by a market rule, unlike the stop', () => {
    const r = live(3, rising());
    setTarget(0.06);
    expect(r.target).toBe(0.06);
    setStop(0);
    expect(r.stop).toBe(0.05);
  });
});

describe('the trade log', () => {
  it('records how far a trade went against you, and how far for you', () => {
    const r = live(null, falling());
    setPos(1);
    run(r, () => r.bar >= r.m.warm + 2);
    setPos(0);
    const t = r.closedTrades[0];
    expect(t.dir).toBe(1);
    expect(t.mae).toBeLessThan(-0.03);
    expect(t.mfe).toBe(0);
    expect(t.pnl).toBeLessThan(t.mae + 0.0001);
    expect(t.r).toBeNull();
    expect(t.bars).toBeGreaterThanOrEqual(2);
  });

  it('measures the result in units of the risk you chose with a stop', () => {
    const r = live(null, falling());
    setStop(0.1);
    setPos(1);
    run(r, () => r.stops > 0);
    const t = r.closedTrades[0];
    expect(t.via).toBe('stop-loss');
    expect(t.r).toBeLessThan(-0.9);
    expect(t.r).toBeCloseTo(t.pnl / 0.1, 10);
  });

  it('logs a trade that is still open when the tape ends', () => {
    const r = live(null, rising());
    setPos(1);
    run(r, () => r.phase === 'over', 60000);
    expect(r.phase).toBe('over');
    expect(r.closedTrades).toHaveLength(1);
    expect(r.closedTrades[0].via).toBe('end');
    expect(r.closedTrades[0].pnl).toBeGreaterThan(0.3);
  });

  it('adds up the fees across the round', () => {
    const r = live(null, rising());
    setPos(1);
    setPos(-1);
    expect(r.fees).toBeCloseTo(FEE + FEE * 2 * (1 - FEE), 8);
    expect(r.closedTrades[0].fees).toBeCloseTo(r.fees, 10);
  });
});

describe('the trade you did not make', () => {
  const late = <T,>(rounds: number, fn: () => T): T => {
    const saved = save.rounds;
    try {
      save.rounds = rounds;
      return fn();
    } finally {
      save.rounds = saved;
    }
  };
  const unknown = (r: Round) => r.closedTrades.filter((t) => t.via === 'unknown');

  it('opens and closes a position on a flat account, late in the story, and never counts as yours', () => {
    late(20, () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const r = live(null, genMarket(31));
      expect(r.phantomAt).not.toBeNull();
      const fees = r.fees;
      run(r, () => r.phase === 'over', 60000);
      expect(unknown(r)).toHaveLength(1);
      expect(unknown(r)[0].bars).toBeGreaterThanOrEqual(3);
      expect(r.nTrades).toBe(0);
      expect(r.closed).toBe(0);
      expect(r.streak).toBe(0);
      expect(r.pos).toBe(0);
      expect(r.fees).toBeGreaterThan(fees);
      // Nothing about it is announced: no result floats up, no streak, no sound-and-callout for a trade.
      expect(v.float).not.toHaveBeenCalled();
      expect(v.callout).not.toHaveBeenCalledWith(expect.stringMatching(/WINS IN A ROW|STOPPED OUT|TARGET HIT/), expect.anything());
    });
  });

  it('puts the position on the account while it runs, as a marker on the chart', () => {
    late(20, () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const r = live(null, genMarket(31));
      run(r, () => r.phantomEnd != null, 60000);
      expect(r.pos).not.toBe(0);
      expect(r.trades.at(-1)!.to).toBe(r.pos);
      run(r, () => r.phantomEnd == null, 60000);
      expect(r.pos).toBe(0);
    });
  });

  it('does not happen early in the story', () => {
    late(0, () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const r = live(null, genMarket(31));
      expect(r.phantomAt).toBeNull();
      run(r, () => r.phase === 'over', 60000);
      expect(unknown(r)).toHaveLength(0);
    });
  });

  it('waits until you are flat, and does not touch a position you took yourself', () => {
    late(20, () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const r = live(null, genMarket(31));
      setPos(1);
      run(r, () => r.bar >= r.phantomAt! + 8, 60000);
      expect(unknown(r)).toHaveLength(0);
      expect(r.pos).toBe(1);
      setPos(0);
      run(r, () => unknown(r).length > 0 || r.bar >= r.m.n - 8, 60000);
      expect(unknown(r).length + (r.phantomEnd != null ? 1 : 0)).toBe(1);
    });
  });

  it('is not closed, announced or counted by your stop-loss or target', () => {
    late(20, () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const r = live(null, genMarket(31));
      setStop(0.001);
      setTarget(0.001);
      run(r, () => r.phase === 'over', 60000);
      expect(r.stops).toBe(0);
      expect(r.closedTrades.filter((t) => t.via === 'stop-loss' || t.via === 'target')).toHaveLength(0);
      expect(r.nTrades).toBe(0);
      expect(v.callout).not.toHaveBeenCalledWith(expect.stringMatching(/STOPPED OUT|TARGET HIT/), expect.anything());
    });
  });

  it('happens at most once in a round', () => {
    late(30, () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);
      const r = live(null, genMarket(77));
      run(r, () => r.phase === 'over', 60000);
      expect(unknown(r).length).toBeLessThanOrEqual(1);
    });
  });
});

describe('the phone call', () => {
  it('rings at bar 88 of market 4 once note 7 is found, and not before', () => {
    const saved = save.rounds;
    try {
      save.rounds = 0;
      expect(live(3).news.some((n) => n.text.includes('PHONE'))).toBe(false);
      save.rounds = 5;
      const r = live(3);
      const ring = r.news.find((n) => n.text.includes('PHONE'))!;
      expect(ring.at).toBe(r.m.warm - 1 + 88);
      expect(ring.diary).toBe(true);
      expect(live(2).news.some((n) => n.text.includes('PHONE'))).toBe(false);
    } finally {
      save.rounds = saved;
    }
  });
});

describe('riskGrade', () => {
  const g = (ret: number, sharpe: number, dd: number) => riskGrade({ ret, sharpe, dd });

  it('rewards return per unit of drawdown, not return alone', () => {
    expect(g(0.3, 1.5, -0.1)).toBe('A');
    expect(g(0.3, 0.6, -0.35)).toBe('B');
    expect(g(0.3, 0.6, -0.5)).toBe('C');
    expect(g(0.2, 0.8, -0.2)).toBe('B');
  });

  it('separates a small loss from a ruinous one', () => {
    expect(g(-0.05, -0.5, -0.1)).toBe('D');
    expect(g(-0.3, -1, -0.4)).toBe('F');
  });
});
