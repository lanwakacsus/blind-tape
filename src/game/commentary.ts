/* What the author says while you trade. He watches the same tape and reacts to what you just
 * did; the further gone he is, the less it sounds like advice. Pure: no DOM. */

import type { GhostStage } from '../engine/ghost';

export type Moment =
  | { kind: 'enter'; side: 1 | -1; ahead: 'crash' | 'melt' | null }
  | { kind: 'win' }
  | { kind: 'loss' }
  | { kind: 'stop' }
  | { kind: 'trades'; n: number }
  | { kind: 'drawdown' }
  | { kind: 'late' };

type ByStage = readonly [string[], string[], string[], string[]];

const ENTER: ByStage = [
  ['small and calm. good.', 'decide the exit before the entry.', 'size it like a hem. long, and exactly.'],
  ['i would have waited one more bar. i always want one more bar.', 'are you sure. i was sure. look how that went.', 'i bought the geobaskets on a feeling too.', 'a stylist would have told you to wait.'],
  ['i watched you do that. i watched myself do that.', 'you looked at the headline first. i saw.', 'no stylist. no stop. no plan. i respect it.', 'i have a record that sounds like that entry.'],
  ['i know. i know where this goes.', 'go ahead. it is already written.', 'in. out. in. it is the same bar.', 'turn it up. it is only the tape.', 'if looks could kill, that entry would have.', 'the family is watching. they have no opinion.'],
];
const WIN: ByStage = [
  ['that is how it is done.', 'take it. do not hold out for more.', 'clean. like a hem.'],
  ['it always looks easy when it works.', 'you took it. i would have held.', 'good. now go and buy something you cannot return.'],
  ['luck. i know luck. i watched it leave.', 'it let you. that is not a compliment.', 'there is a record for this feeling. i have it on.'],
  ['it let you win. it lets everyone, once.', 'that was already written too.', 'great chaos. the good kind.', 'more chaos. there is always more chaos.', 'now wear black. the tape will notice.'],
];
const LOSS: ByStage = [
  ['cut it. pay the fee. move on.', 'one loss is nothing. size is everything.', 'small loss. big hem.'],
  ['it is not the market. it is never the market.', 'that was a bad trade. you know it was.', 'it did not fit. return it. you cannot return it.'],
  ['they took it from you. i said they would.', 'that is what a toll looks like. you could have stayed flat.', 'no stylist. look what happens.'],
  ['i have lost that exact trade. on that exact bar.', 'it is only a number. it is not only a number.', 'down. this is the part where it gets loud.', 'lonely does not destroy itself. you have to help.', 'that was more than the server.'],
];
const STOP: ByStage = [
  ['the stop did its job. that is what it is for.', 'a stop that fires is a stop that works.', 'a stop is a hem. it decides where the garment ends.'],
  ['it stopped you out and then it went back up. it always does.', 'who chose 5%. it was me.', 'i set that stop with the same confidence i bought the geobaskets.'],
  ['it fires at the bottom. it always fires at the bottom.', 'the stop is a promise. it keeps it.', 'black. cut. gone.'],
  ['i set that stop. i set it a long time ago.', 'it was always going to fire there.', 'the third record is on. it knew too.'],
];
const DRAWDOWN: ByStage = [
  ['you are down. this is when people add. do not add.', 'down is a colour. black is a colour. it is a position.'],
  ['this is how it started for me. i did not step away.', 'step away. put on the record. do not put on the record.'],
  ['i know this place. it is not a place. you should step away from the screen. i never did.', 'the shoes are on the floor. i am on the floor.'],
  ['down. only for now. it is not only for now.', 'there is a record about this. it has not come out yet.'],
];
const LATE = ['it is 3 am. i said not to.', 'i said not after 3. you came anyway.', 'it is 3 am. so is it for me.', 'it is 3 am. put on black. put on the record.', 'it is 3 am. the family is awake.'];

/** He knows what the tape does next once he is far enough gone. */
const AHEAD: Record<'crash' | 'melt', Record<'long' | 'short', string[]>> = {
  crash: { long: ["don't.", 'not now. not now. not now.'], short: ['yes. how did you know.', 'you see it too.'] },
  melt: { long: ['yes.', 'good. good.'], short: ['no.', 'you will regret that.'] },
};

const pick = <T>(a: readonly T[], rnd: () => number): T => a[Math.floor(rnd() * a.length)];

export function remark(moment: Moment, stage: GhostStage, rnd: () => number = Math.random): string | null {
  switch (moment.kind) {
    case 'enter':
      if (moment.ahead && stage >= 2) return pick(AHEAD[moment.ahead][moment.side > 0 ? 'long' : 'short'], rnd);
      return pick(ENTER[stage], rnd);
    case 'win':
      return pick(WIN[stage], rnd);
    case 'loss':
      return pick(LOSS[stage], rnd);
    case 'stop':
      return pick(STOP[stage], rnd);
    case 'drawdown':
      return pick(DRAWDOWN[stage], rnd);
    case 'late':
      return pick(LATE, rnd);
    case 'trades': {
      const fees = (moment.n * 0.1).toFixed(1);
      return [
        `${moment.n} trades. that is ${fees}% in fees. slow down.`,
        `${moment.n} trades. they are taking it from you. you can stop.`,
        `${moment.n}. i counted. i count everything.`,
        `${moment.n}. i have counted every one. i am still counting.`,
      ][stage];
    }
  }
}
