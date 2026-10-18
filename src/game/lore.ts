/* The author's voice: the quote of the day, a note per market during the countdown, the
 * greeting and the verdict on the debrief. Pure: no DOM. */

export interface Saying {
  text: string;
  source: string;
}

/** The title page's "quote of the day". It never changes. */
export const QUOTE_OF_THE_DAY: Saying = { text: 'The trend is your friend until the end.', source: 'old trading proverb' };

/** One note from the author for each season market. He is calmer on the first. */
export const OMENS: Saying[] = [
  { text: 'Take your time on this one. Nothing happens fast, and the news is mostly right. Count the bars. I always count the bars.', source: 'note 1' },
  { text: 'Trends last longer than you expect. So do the people betting against them. A grind runs 25 to 60 bars. I have timed it.', source: 'note 2' },
  { text: "If you're getting chopped up, STOP TRADING. Chop is 20 to 50 bars of nothing. It isn't the market doing it. I checked. I checked all night.", source: 'note 3' },
  { text: 'A CRASH IS 4 TO 10 BARS. NEVER 11. I HAVE TIMED IT SIX HUNDRED TIMES. DECIDE BEFORE IT STARTS. SOMEBODY ALWAYS KNOWS BEFORE IT STARTS.', source: 'note 4' },
  { text: "HALF THE HEADLINES ON THIS ONE ARE MADE UP. I WROTE THEM THAT WAY. I DON'T REMEMBER WRITING THEM.", source: 'note 5' },
];

/** Used for daily tapes and imported CSVs. */
export const OMEN_FALLBACK: Saying = { text: 'SAME TAPE FOR EVERYONE TODAY. THAT IS THE PROBLEM.', source: 'note 0' };

export interface VerdictInput {
  ret: number;
  /** Buy & hold return on the same tape. */
  bhRet: number;
  trades: number;
}

/** A line for the end of the round, chosen by how it went. */
export function verdict({ ret, bhRet, trades }: VerdictInput): string {
  if (trades === 0) return "YOU DID NOTHING. FINE. FLAT IS ALSO A POSITION. IT IS THE ONLY ONE THEY CAN'T TAKE FROM YOU.";
  if (ret > 0 && ret > bhRet) return 'YOU BEAT THE TAPE. I NEVER DID. NOT IN FOUR HUNDRED TRIES. SHOW ME THE TRADES. I NEED TO SEE THE TRADES.';
  if (ret > 0) return "A PROFIT. BUT HOLDING WOULD HAVE DONE BETTER. IT ALWAYS DOES. I RAN IT EVERY WAY. HOLDING WINS. NOBODY WANTS TO HEAR IT. YOU DIDN'T EITHER.";
  if (trades >= 12) return `${trades} TRADES. THAT IS AT LEAST ${(trades * 0.1).toFixed(1)}% GONE BEFORE THE TAPE MOVES. THEY TAKE IT EVERY TIME. I TOLD YOU THAT.`;
  return 'THE TAPE DOES NOT CARE. IT IS NOT AGAINST YOU. I USED TO THINK IT WAS. I STILL HAVE THE CHARTS FROM WHEN I THOUGHT SO. IT WAS A BAD TRADE. YOU KNOW IT WAS.';
}

/** "3 days ago", for the boot log. */
export function lastSeen(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'moments ago';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** His rule is no trading after 3 AM. At that hour he is all the way there. */
export const isLate = (d: Date): boolean => d.getHours() === 3;

export interface BootInput {
  /** Visits so far, counting this one. */
  visits: number;
  /** Milliseconds since the previous visit, or null on the first. */
  sinceLast: number | null;
  /** It is the 3 AM hour where the player is. */
  late?: boolean;
  /** Days since the author last logged in. */
  uptimeDays?: number;
}

/** The greeting at the top of the title page. */
export function bootLines({ visits, sinceLast, late, uptimeDays }: BootInput): string[] {
  return [
    ...(late ? ['it is 3 am. i said not to.'] : []),
    sinceLast == null ? 'Welcome, visitor. Please do not share this address.' : `Welcome back. Visit ${visits}. You were last here ${lastSeen(sinceLast)}. I noticed.`,
    'Visitors online now: 1 (if it says 2, close the tab)',
    ...(uptimeDays == null ? [] : [`Last admin login: 14 March 2011, 03:17. Server uptime: ${uptimeDays.toLocaleString('en-US')} days.`]),
    'Please do not take screenshots.',
  ];
}
