/* The author's claims about the game, each one testable on the game's own engine. A claim is
 * checked on a sample of markets the player chooses; the verdict is judged against a much
 * bigger sample, so a small one can mislead. Pure: no DOM. */

import { backtest, stats } from './backtest';
import { LEVELS, dailyMarket, genMarket, type Market } from './market';
import { makeWire } from './news';
import { SWEEP_FAST, SWEEP_SLOW, runBot, smaSweep } from './research';
import { STRATS, defaultParams, strategy } from './strategies';

export interface ClaimResult {
  /** Whether the claim holds on this sample. */
  holds: boolean;
  evidence: string[];
}

export interface Claim {
  id: string;
  text: string;
  /** What the author says when the player's verdict matches the truth. */
  right: string;
  /** What he says when it doesn't. */
  wrong: string;
  evaluate(n: number): ClaimResult;
}

export const SAMPLES = [10, 50, 300] as const;
/** The sample the truth is judged on. */
export const FULL = 300;

const seeds = (n: number) => Array.from({ length: n }, (_, i) => ((i * 7919 + 104729) % 99991) + 1);
const markets = (n: number, opts = {}) => seeds(n).map((s) => genMarket(s, opts));
const days = (n: number) => Array.from({ length: n }, (_, d) => new Date(Date.UTC(2011, 0, 1 + d)).toISOString().slice(0, 10));
const pct = (v: number, digits = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`;
const share = (k: number, n: number) => `${k} of ${n} (${Math.round((100 * k) / n)}%)`;
const holdRet = (m: Market) => stats(backtest(m.closes.map(() => 1), m).eq).ret;
const cross = strategy('sma');

export const CLAIMS: Claim[] = [
  {
    id: 'crash',
    text: 'A CRASH IS 4 TO 10 BARS. IT IS NEVER 11.',
    right: 'you timed them too. nobody times them. it is never 11, is it.',
    wrong: "no. no no. you did not look at enough of them. 4 to 10. never 11. i have six hundred timed. you have ten.",
    evaluate(n) {
      const lens: number[] = [];
      for (const m of markets(n)) for (const s of m.regimes!) if (s.k === 'crash' && s.to < m.n - 1) lens.push(s.to - s.from + 1);
      const min = Math.min(...lens);
      const max = Math.max(...lens);
      return {
        holds: lens.length > 0 && min >= 4 && max <= 10,
        evidence: [`Crashes measured: ${lens.length}`, `Shortest: ${min} bars. Longest: ${max} bars.`, max > 10 ? 'Some lasted 11 or more.' : 'None lasted 11 or more.'],
      };
    },
  },
  {
    id: 'fees',
    text: '40 TRADES COST 4%. 4% OF EVERYTHING YOU HAVE.',
    right: '4% a round. every round. now you see what i see.',
    wrong: 'do it again. 0.999 to the 40th. i did it on paper. i did it on the wall.',
    evaluate() {
      const m = genMarket(5);
      const flat = makeMarketFlat(m);
      const pos = flat.closes.map((_, i) => (i < flat.warm + 39 ? i % 2 : 0));
      const r = backtest(pos, flat);
      const cost = 1 - r.eq[r.eq.length - 1];
      return { holds: Math.abs(cost - 0.04) < 0.005, evidence: [`${r.trades} position changes on a tape that goes nowhere.`, `Equity left: ${(100 * (1 - cost)).toFixed(2)}%. Cost: ${(cost * 100).toFixed(2)}%.`, 'This one does not depend on the sample.'] };
    },
  },
  {
    id: 'wire',
    text: 'THE HEADLINES COME TRUE. MOST OF THEM. I HAVE THE TABLE.',
    right: 'two thirds. the rest is bait. i know which ones. i am not going to say which ones.',
    wrong: 'you think they are mostly bait. they are mostly true. that is worse, isn’t it.',
    evaluate(n) {
      let followed = 0;
      let total = 0;
      for (const m of markets(n, LEVELS[2])) for (const h of makeWire(m, LEVELS[2].noise)) (total++, h.followed && followed++);
      return { holds: followed / total > 0.5, evidence: [`Headlines measured: ${total}`, `Followed by the move they described: ${share(followed, total)}`] };
    },
  },
  {
    id: 'hold',
    text: 'STANDING STILL BEATS EVERY BOT. EVERY ONE.',
    right: 'standing still wins. it hurts me every time i check.',
    wrong: 'run it again. the bots are not better. they are busy. busy is not better.',
    evaluate(n) {
      const ms = markets(n);
      const mean = (f: (m: Market) => number) => ms.reduce((a, m) => a + f(m), 0) / ms.length;
      const hold = mean(holdRet);
      const bots = STRATS.filter((S) => S.id !== 'bh').map((S) => ({ S, ret: mean((m) => runBot(S, m, defaultParams(S)).st.ret) }));
      return {
        holds: bots.every((b) => hold > b.ret),
        evidence: [`Average over ${n} markets:`, `Buy & hold ${pct(hold)}`, ...bots.map((b) => `${b.S.call} ${pct(b.ret)}`)],
      };
    },
  },
  {
    id: 'cross',
    text: 'CROSS BEATS BUY & HOLD MORE OFTEN THAN NOT. I SAW IT. I WATCHED IT.',
    right: "good. you didn't trust ten. nobody should trust ten.",
    wrong: 'you stopped at ten. everybody stops at ten. it looked so good at ten.',
    evaluate(n) {
      let beat = 0;
      for (const m of markets(n)) if (runBot(cross, m, defaultParams(cross)).st.ret > holdRet(m)) beat++;
      return { holds: beat / n > 0.5, evidence: [`CROSS beat buy & hold on ${share(beat, n)}.`] };
    },
  },
  {
    id: 'tuned',
    text: 'THE BEST CROSS SETTINGS ON ONE TAPE ARE STILL THE BEST ON THE NEXT.',
    right: 'you know about the hidden tape. good. do not tune to the tape. the tape finds out.',
    wrong: 'that is what it wants you to think. tuned settings die on the next tape. every time. i keep a folder of them. it is called graves.',
    evaluate(n) {
      const ss = seeds(n * 2);
      let a = 0;
      let b = 0;
      for (let i = 0; i < n; i++) {
        const [mA, mB] = [genMarket(ss[i * 2]), genMarket(ss[i * 2 + 1])];
        let best = -Infinity;
        let [fast, slow] = [0, 0];
        smaSweep(mA, false).forEach((row, fi) =>
          row.forEach((v, si) => {
            if (v != null && v > best) [best, fast, slow] = [v, SWEEP_FAST[fi], SWEEP_SLOW[si]];
          }),
        );
        a += best;
        b += runBot(cross, mB, { fast, slow, short: false }).st.ret;
      }
      return {
        holds: b / n >= 0.75 * (a / n),
        evidence: [`Best CROSS settings on tape A, averaged over ${n} pairs: ${pct(a / n)}`, `The same settings on tape B: ${pct(b / n)}`],
      };
    },
  },
  {
    id: 'repeat',
    text: 'THE DAILY TAPE REPEATS. I WAS SURE I SAW IT REPEAT.',
    right: 'it does not repeat. thank you. i keep telling myself that.',
    wrong: 'it does not repeat. i checked. i checked again. i have checked every day since.',
    evaluate(n) {
      const seen = new Set<string>();
      let dup = 0;
      for (const day of days(n * 3)) {
        const key = dailyMarket(day).closes.slice(0, 8).map((c) => c.toFixed(4)).join(',');
        if (seen.has(key)) dup++;
        seen.add(key);
      }
      return { holds: dup > 0, evidence: [`Daily tapes compared: ${n * 3}`, `Identical to an earlier day: ${dup}`] };
    },
  },
  {
    id: 'short',
    text: 'CROSS MAKES MORE MONEY WHEN IT IS ALLOWED TO SHORT.',
    right: 'shorting does not pay. i wanted it to.',
    wrong: 'i wanted it to pay too. it does not.',
    evaluate(n) {
      const ms = markets(n);
      const mean = (short: boolean) => ms.reduce((a, m) => a + runBot(cross, m, { ...defaultParams(cross), short }).st.ret, 0) / n;
      const [withShort, without] = [mean(true), mean(false)];
      return { holds: withShort > without, evidence: [`Average over ${n} markets:`, `CROSS allowed to short ${pct(withShort)}`, `CROSS long only ${pct(without)}`] };
    },
  },
  {
    id: 'dailycrash',
    text: 'EVERY DAILY TAPE HAS A CRASH IN IT. SOME DAYS IT IS JUST LATE.',
    right: 'most days there is none. that is the part that frightens me. the days with none.',
    wrong: 'no. there are quiet days. i do not trust the quiet days.',
    evaluate(n) {
      const ds = days(n);
      const withCrash = ds.filter((d) => dailyMarket(d).regimes!.some((s) => s.k === 'crash' && s.from >= dailyMarket(d).warm)).length;
      return { holds: withCrash === ds.length, evidence: [`Daily tapes with a crash while you can trade: ${share(withCrash, ds.length)}`] };
    },
  },
];

/** A copy of a market on which the price never moves. */
function makeMarketFlat(m: Market): Market {
  const bar = { o: 100, h: 100, l: 100, c: 100 };
  return { ...m, bars: m.bars.map(() => bar), closes: m.closes.map(() => 100) };
}

const fulls = new Map<string, ClaimResult>();

/** The result on the full sample, which is what the verdict is judged against. */
export function fullResult(claim: Claim): ClaimResult {
  if (!fulls.has(claim.id)) fulls.set(claim.id, claim.evaluate(FULL));
  return fulls.get(claim.id)!;
}

/** What is actually true. */
export const truthOf = (claim: Claim): boolean => fullResult(claim).holds;
