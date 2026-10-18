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
    when: '19 JAN 2011 05:20',
    rounds: 2,
    text: 'i have been listening to a record called a great chaos. it has not come out yet. i do not know where i got it. the person who made it is, by my math, in middle school. it is very loud. i have played it 40 times',
    leak: 'THE RECORD HAS NOT COME OUT YET',
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
    when: '26 FEB 2011 04:02',
    rounds: 4,
    text: 'ordered a pair of geobaskets. i do not know what they are. the name was on a list in my handwriting. they cost more than the server. i have paid the server through 2040',
    leak: 'THE GEOBASKETS HAVE BEEN ORDERED',
  },
  {
    when: '28 FEB 2011 03:12',
    rounds: 4,
    text: 'there is a second record. it is called more chaos. it has not been announced and i have it. it is louder than the first one, which i did not think was possible. i have put a towel under the door so the tape cannot hear it. tip: if a position feels too loud, halve it',
    leak: 'THERE IS A SECOND RECORD. HE HAS IT',
  },
  {
    when: '01 MAR 2011 04:30',
    rounds: 4,
    text: 'i looked up who makes the geobaskets. rick owens. i had not looked up anyone. the name came up on its own. the shoes are the only thing in this room i did not make. everything else is a tape',
    leak: 'THE SHOES ARE THE ONLY THING IN THE ROOM HE DID NOT MAKE',
  },
  {
    when: '02 MAR 2011 02:08',
    rounds: 4,
    text: '0.10% a trade. i did the math. 40 trades is 4%. 4% a round. every round. they are not taking it from the tape, they are taking it from you, and then they say the market was against you. tip:',
    leak: 'TOLL COLLECTED. THE TOLL IS ALWAYS COLLECTED',
  },
  {
    when: '03 MAR 2011 05:05',
    rounds: 5,
    text: 'drew the geobasket on the wall above the monitor. it is the right size. the wall is not. a record called no stylist is on. i have never had a stylist. i dress for the tape. the tape does not see me. the tape sees me',
    leak: 'NO STYLIST',
  },
  {
    when: '04 MAR 2011 23:40',
    rounds: 5,
    text: 'the cashier at the corner shop asked why i was dressed like that. i said it was for the tape. she said what tape. i said exactly',
  },
  {
    when: '05 MAR 2011 06:11',
    rounds: 5,
    text: "my mother called. i didn't pick up. the 4th market was at bar 88 and i couldn't look away from it. she left a message. i am saving it for when the tape is over. the tape is never over. i have stopped sleeping in the bedroom because the tape is on the desktop",
    leak: 'A CALL WENT UNANSWERED. THE TAPE WAS AT BAR 88',
  },
  {
    when: '07 MAR 2011 03:44',
    rounds: 6,
    text: 'the geobaskets came. they are enormous. they do not fit through the hall. i wore them to the bus stop. the man there said again that you can leave the page open and it will keep your place. i do not know what he means',
  },
  {
    when: '08 MAR 2011 03:03',
    rounds: 6,
    text: 'ramones low. kiss boots. i have started calling them the family. the family is in the hall. i keep the door shut so they cannot see the screen. they can see the screen',
    leak: 'THE FAMILY IS IN THE HALL',
  },
  {
    when: '09 MAR 2011 05:52',
    rounds: 6,
    text: 'a crash is 4 to 10 bars. i have timed it. i have timed it 600 times. it is never 11. why is it never 11. i am not going to discuss whether it is random. it is not random',
    leak: 'A CRASH IS NEVER 11 BARS. WHY IS IT NEVER 11',
  },
  {
    when: '10 MAR 2011 02:50',
    rounds: 7,
    text: 'there is a person called destroy lonely. i thought it was an instruction. i have not followed it. i also do not have a stylist. i have a tape',
  },
  {
    when: '10 MAR 2011 05:15',
    rounds: 7,
    text: 'the person who made a great chaos has a name. ken carson. i typed it into the search box three times. it returned the tape. i did not search for the tape',
    leak: 'THE SEARCH BOX RETURNED THE TAPE',
  },
  {
    when: '10 MAR 2011 23:58',
    rounds: 7,
    text: 'i have been playing project x, then x, then teen x, then a great chaos, in order, with the monitor off. they are about the same thing. they are about the same thing as the tape. i am not sure what that is. i will know by the fourth listen. it is the fourth listen',
  },
  {
    when: '11 MAR 2011 03:30',
    rounds: 8,
    text: 'i found my notes in the code. i do not remember putting them there. they are in the headlines. they are in the bot descriptions. i delete them and they are back in the next build. either the game is keeping them for me or someone else has the repository',
    leak: 'THE NOTES ARE IN THE CODE. HE DELETES THEM. THEY RETURN',
  },
  {
    when: '11 MAR 2011 23:14',
    rounds: 8,
    text: 'wore black to the post office. all of it. the clerk asked if someone had died. i said not yet. she gave me a form. i have not filled it in. it is the only form i have ever wanted',
    leak: 'NOT YET',
  },
  {
    when: '12 MAR 2011 04:47',
    rounds: 10,
    text: "the footer says if everything goes to plan i will update this game every year. i wrote that in a good week. i don't know what the plan is anymore. i know there is one. i have started writing down who has access to this page. the list is longer than it should be",
    leak: 'IF EVERYTHING GOES TO PLAN',
  },
  {
    when: '12 MAR 2011 21:00',
    rounds: 10,
    text: 'destroy lonely. i have worked it out. it is not an instruction. it is a forecast. lonely is a thing you can destroy and i have been waiting for the order to start. there is a second one, if looks could kill. i looked in the mirror. nothing happened. tip: sit on your hands',
    leak: 'IF LOOKS COULD KILL. NOTHING HAPPENED',
  },
  {
    when: '12 MAR 2011 23:30',
    rounds: 11,
    text: 'drkshdw. i had it written on the back of my hand. i do not know what it stands for. i washed it off. it was back in the morning, in my handwriting, smaller',
  },
  {
    when: '13 MAR 2011 02:19',
    rounds: 12,
    text: 'i keep a grey notebook next to the keyboard. it has every bar of every daily tape since august. last night i found a page in my handwriting for a date that has not happened yet. i checked it against the tape this morning. it was right',
    leak: 'A PAGE IN HIS HANDWRITING FOR A DATE THAT HAS NOT HAPPENED YET',
  },
  {
    when: '13 MAR 2011 23:50',
    rounds: 12,
    text: 'tecuatl. i found it on a list. i do not know what it is. i know the shape. it is dark and it covers the eyes. i have been wearing sunglasses at the desk. the tape is brighter with them on. i am told this is not how it works',
    leak: 'HE HAS BEEN WEARING SUNGLASSES AT THE DESK',
  },
  {
    when: '14 MAR 2011 01:10',
    rounds: 14,
    text: 'a great chaos is 2023. i do not know why i wrote 2023. it is in the margin of the grey notebook. under it: more chaos. under that: 2025. under that, in the same handwriting, a date after that. i am not going to write that date. i am going to look at it for a while',
    leak: 'HE WROTE DOWN THE YEARS. THEY ARE NOT YEARS YET',
  },
  {
    when: '14 MAR 2011 02:30',
    rounds: 16,
    text: 'the shop says the next pair is not available until i stop asking. i have stopped asking. i am asking. i am asking the server. it is the only one that answers. it says size 43',
  },
  {
    when: '14 MAR 2011 02:52',
    rounds: 18,
    text: 'i have all of them. the geobasket. the ramones. the kiss boots. the hoodie. the tecuatl. they are laid out on the floor in the order of the records. in the middle is the chair. i am going to sit down now. keep the page open. it will keep your place',
    leak: 'HE SAT DOWN. KEEP THE PAGE OPEN',
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
