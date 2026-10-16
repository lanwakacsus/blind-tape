/* Daily challenge calendar. Days roll over at 00:00 UTC. */

const FIRST_DAY = '2026-10-01';

export const todayUTC = () => new Date().toISOString().slice(0, 10);

/** Challenge number: #1 was FIRST_DAY. */
export const dailyNo = (day: string) => Math.round((Date.parse(day) - Date.parse(FIRST_DAY)) / 864e5) + 1;

/** Short local label for a UTC date, e.g. "Oct 15". */
export const dayLabel = (day: string) =>
  new Date(day + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function timeToNextTape(now = new Date()): string {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const ms = next - now.getTime();
  return `New tape in ${Math.floor(ms / 36e5)}h ${Math.floor((ms % 36e5) / 6e4)}m`;
}
