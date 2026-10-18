/* The server's access log. One address, one bot, every night at 03:17 UTC since the night he
 * stopped: it asks for tomorrow's tape, and is told there is none. The last line is tomorrow's.
 * Pure: no DOM. */

/** The first night of the log: the one after his last note. */
export const LOG_STARTS = Date.UTC(2011, 2, 15);

const ADDRESS = '192.0.2.17';
const AGENT = 'm.bot/1.4';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 864e5;
const pad = (n: number) => String(n).padStart(2, '0');

/** The 03:17 UTC request on the day that begins at `dayStart` (a UTC midnight). */
function line(dayStart: number): string {
  const d = new Date(dayStart);
  const second = 2 + (Math.round((dayStart - LOG_STARTS) / DAY) * 7) % 5;
  const stamp = `${pad(d.getUTCDate())}/${MONTHS[d.getUTCMonth()]}/${d.getUTCFullYear()}:03:17:${pad(second)} +0000`;
  return `${ADDRESS} - - [${stamp}] "GET /tomorrow HTTP/1.1" 404 312 "-" "${AGENT}"`;
}

/** The UTC midnight that begins tomorrow, as seen from `now`. */
export const tomorrowStart = (now: Date): number => Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + DAY;

/** How many nightly requests there are, tomorrow's included. */
export const accessLines = (now: Date): number => Math.round((tomorrowStart(now) - LOG_STARTS) / DAY) + 1;

/** The most recent 03:17 UTC that has already happened. */
export function lastRunAt(now: Date): Date {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + (3 * 60 + 17) * 60000;
  return new Date(today <= now.getTime() ? today : today - DAY);
}

/** The tail of the log. The earlier lines were rotated away. */
export function accessLog(now: Date, shown = 30): string {
  const total = accessLines(now);
  const last = tomorrowStart(now);
  const lines = Array.from({ length: Math.min(shown, total) }, (_, i) => line(last - (Math.min(shown, total) - 1 - i) * DAY));
  const omitted = total - lines.length;
  return [`# access.log: the last ${lines.length} of ${total.toLocaleString('en-US')} lines. the earlier ${omitted.toLocaleString('en-US')} were rotated away.`, ...lines].join('\n');
}
