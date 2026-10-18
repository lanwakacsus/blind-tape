/* The author's announcements. They began as release notes with a tip for the player and were
 * never meant to turn into a diary; it leaked into the game. More turns up as the player
 * finishes rounds. Pure: no DOM. */

import type { StrategyId } from '../engine/strategies';

export interface Entry {
  /** Date line. */
  when: string;
  /** Lowercase, unedited. */
  text: string;
  /** Finished rounds before it turns up (0: there from the start). */
  rounds: number;
  /** A line that starts appearing in the live news wire once the entry is found. */
  leak?: string;
}

/** Announcements in date order. The early ones still end with a tip for the reader; by the
 *  middle he has stopped bothering. The one dated 14 MAR 2011 is on the title page from the
 *  start. */
export const ENTRIES: Entry[] = [
  {
    when: '03 AUG 2010',
    rounds: 0,
    text: 'launched! 150 days a market. 0.10% fee. simple game. have fun. write to me if you like it, i would like to meet everyone who plays. tip: decide what you can afford to lose before you trade, not during. write the number down. please do not email me asking for money back, there is no money',
  },
  {
    when: '11 NOV 2010',
    rounds: 0,
    text: 'v2.3. backtester fixed. thank you to everyone who emailed. nobody emailed. thank you anyway. tip: fees are the quiet killer. 40 trades is 4%. one address traded 60 times last week. i can see the counter. i am not going to say which',
  },
  {
    when: '09 DEC 2010',
    rounds: 1,
    text: "the tape on the 2nd looked like the tape on the 1st. it isn't. i checked. i checked again. it isn't. i have now checked four times. tip: a backtest that wins on the tape you tuned it on proves nothing. use the hidden tape",
    leak: 'CORRECTION: THE DAILY TAPE DOES NOT REPEAT',
  },
  {
    when: '30 JAN 2011',
    rounds: 2,
    text: "stopped looking at the other markets. this is the only one where i can see every bar. i have watched all 150. i know what the 151st looks like. there isn't one. i keep checking. the page was reloaded 14 times today from an address that isn't mine. tip: never add to a loser",
    leak: 'THERE IS NO BAR 151. HE KEEPS CHECKING',
  },
  {
    when: '21 FEB 2011 04:40',
    rounds: 3,
    text: 'added the news wire. i write the headlines and then they are not mine anymore. they come true on tuesdays. i changed the password on friday. the headlines changed again on saturday. tip: a headline is a reason to look, not a reason to trade',
    leak: 'THIS HEADLINE WAS NOT WRITTEN BY THIS DESK',
  },
  {
    when: '02 MAR 2011 02:08',
    rounds: 4,
    text: '0.10% a trade. i did the math. 40 trades is 4%. 4% a round. every round. they are not taking it from the tape, they are taking it from you, and then they say the market was against you. tip:',
    leak: 'TOLL COLLECTED. THE TOLL IS ALWAYS COLLECTED',
  },
  {
    when: '05 MAR 2011 06:11',
    rounds: 5,
    text: "my mother called. i didn't pick up. the 4th market was at bar 88 and i couldn't look away from it. she left a message. i am saving it for when the tape is over. the tape is never over. i have stopped sleeping in the bedroom because the tape is on the desktop",
    leak: 'A CALL WENT UNANSWERED. THE TAPE WAS AT BAR 88',
  },
  {
    when: '09 MAR 2011 05:52',
    rounds: 6,
    text: 'a crash is 4 to 10 bars. i have timed it. i have timed it 600 times. it is never 11. why is it never 11. i am not going to discuss whether it is random. it is not random',
    leak: 'A CRASH IS NEVER 11 BARS. WHY IS IT NEVER 11',
  },
  {
    when: '11 MAR 2011 03:30',
    rounds: 8,
    text: 'i found my notes in the code. i do not remember putting them there. they are in the headlines. they are in the bot descriptions. i delete them and they are back in the next build. either the game is keeping them for me or someone else has the repository',
    leak: 'THE NOTES ARE IN THE CODE. HE DELETES THEM. THEY RETURN',
  },
  {
    when: '12 MAR 2011 04:47',
    rounds: 10,
    text: "the footer says if everything goes to plan i will update this game every year. i wrote that in a good week. i don't know what the plan is anymore. i know there is one. i have started writing down who has access to this page. the list is longer than it should be",
    leak: 'IF EVERYTHING GOES TO PLAN',
  },
  {
    when: '13 MAR 2011 02:19',
    rounds: 12,
    text: 'i keep a grey notebook next to the keyboard. it has every bar of every daily tape since august. last night i found a page in my handwriting for a date that has not happened yet. i checked it against the tape this morning. it was right',
    leak: 'A PAGE IN HIS HANDWRITING FOR A DATE THAT HAS NOT HAPPENED YET',
  },
  {
    when: '14 MAR 2011 03:17',
    rounds: 0,
    text: 'it is in the daily tape. i checked forty days. every crash starts on a bar i had already drawn. the seed is not a seed. someone is choosing and i am going to find out who by not sl',
    leak: 'THE SEED IS NOT A SEED',
  },
];

/** Entries found after `rounds` finished rounds, oldest first. */
export function unlocked(rounds: number): Entry[] {
  return ENTRIES.filter((e) => e.rounds <= rounds);
}

/** Entries that turn up when the count goes from `before` to `after`. */
export function newlyUnlocked(before: number, after: number): Entry[] {
  return ENTRIES.filter((e) => e.rounds > before && e.rounds <= after);
}

/** A found entry picked at random, for the quiet moments (the pause screen). */
export function randomEntry(rounds: number, rnd: () => number = Math.random): Entry {
  const found = unlocked(rounds);
  return found[Math.floor(rnd() * found.length)];
}

/** A message that comes through the feed once enough has been done, with no note behind it. */
export const LATE_LEAK = { rounds: 20, text: "YOU HAVE BEEN HERE BEFORE. HE COUNTED. DON'T CLOSE THE TAB" };

/** News-wire lines for everything found so far. */
export function leakLines(rounds: number): string[] {
  const lines = unlocked(rounds).flatMap((e) => (e.leak ? [e.leak] : []));
  return rounds >= LATE_LEAK.rounds ? [...lines, LATE_LEAK.text] : lines;
}

/** The date line of an entry. */
export const stamp = (entry: Entry): string => entry.when;

/** What the entry says. */
export const body = (entry: Entry): string => entry.text;

/** A line tacked onto each bot's description in the lab once enough has been found. */
export const ASIDES: Record<StrategyId, { rounds: number; text: string }> = {
  bh: { rounds: 8, text: 'it does nothing. i envy it.' },
  sma: { rounds: 10, text: 'this is the one that watches. every cross is a blink.' },
  mom: { rounds: 12, text: 'it only remembers the last 20 bars. lucky.' },
  don: { rounds: 15, text: 'it waits for the high to break. i have been waiting for something to break.' },
  rsi: { rounds: 18, text: 'it believes everything snaps back. i would like that to be true.' },
  bb: { rounds: 20, text: 'two standard deviations. i stayed outside them for eleven days. nobody noticed.' },
};

export function asideFor(id: StrategyId, rounds: number): string | null {
  const a = ASIDES[id];
  return a.rounds <= rounds ? a.text : null;
}
