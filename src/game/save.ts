/* Local progress kept in localStorage: season stars, mute, bot lab settings and the
 * player's own daily runs. Loaded once at startup. */

import { LEVELS } from '../engine/market';
import type { LabSettings } from '../engine/research';
import { STRATS, defaultParams } from '../engine/strategies';
import { NO_INDICATORS, type Indicators } from '../engine/indicators';
import { newlyUnlocked, type Entry } from './diary';
import { KEEP, type JournalEntry } from './journal';

export interface DailyRecord {
  day: string;
  status: 'started' | 'done';
  ret: number | null;
  stars?: number;
  place?: number;
  racers?: number;
  trades?: number;
  grid?: string;
}

export interface SaveData {
  seasonSeed: number;
  stars: number[];
  muted: boolean;
  lab: LabSettings;
  daily: Record<string, DailyRecord>;
  /** Rounds played to the end, in any mode. Unlocks the author's diary. */
  rounds: number;
  /** Claims the player has ruled on: what they said, and whether they were right. */
  claims: Record<string, { guess: boolean; right: boolean }>;
  /** Which indicators are drawn on the live chart. */
  indicators: Indicators;
  /** One line per finished round, newest last. */
  journal: JournalEntry[];
}

const SAVE_KEY = 'blindtape.v2';
/** How many days of daily records to keep. */
const KEEP_DAYS = 30;

export const randomSeed = () => 1 + Math.floor(Math.random() * 99990);

/** Drops all but the newest `keep` date keys, in place. */
export function trimDays(record: Record<string, unknown>, keep = KEEP_DAYS): void {
  for (const k of Object.keys(record).sort().slice(0, -keep)) delete record[k];
}

function defaultLab(): LabSettings {
  return Object.fromEntries(STRATS.map((S) => [S.id, { on: true, params: defaultParams(S) }])) as LabSettings;
}

function load(): SaveData {
  let data: SaveData = { seasonSeed: randomSeed(), stars: [0, 0, 0, 0, 0], muted: false, lab: defaultLab(), daily: {}, rounds: 0, claims: {}, indicators: { ...NO_INDICATORS }, journal: [] };
  let storedLab: Partial<LabSettings> | null = null;
  try {
    const stored = JSON.parse(localStorage.getItem(SAVE_KEY) as string);
    if (stored && Array.isArray(stored.stars)) {
      storedLab = stored.lab;
      data = { ...data, ...stored };
    }
  } catch {
    // Private mode or corrupt data: start fresh.
  }
  if (!data.daily || typeof data.daily !== 'object') data.daily = {};
  if (!Number.isInteger(data.rounds) || data.rounds < 0) data.rounds = 0;
  if (!data.claims || typeof data.claims !== 'object' || Array.isArray(data.claims)) data.claims = {};
  data.journal = Array.isArray(data.journal) ? data.journal.slice(-KEEP) : [];
  data.indicators = Object.fromEntries(Object.keys(NO_INDICATORS).map((k) => [k, data.indicators?.[k as keyof Indicators] === true])) as unknown as Indicators;
  trimDays(data.daily);

  // Merge stored bot settings over the defaults so new params get sensible values.
  const lab = defaultLab();
  if (storedLab) {
    for (const S of STRATS) {
      const s = storedLab[S.id];
      if (s) lab[S.id] = { on: s.on !== false, params: { ...lab[S.id].params, ...s.params } };
    }
  }
  data.lab = lab;
  return data;
}

export const save: SaveData = load();
/** The bot settings, shared by reference with save.lab. */
export const lab: LabSettings = save.lab;

export function persist(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage blocked: progress lasts for this visit only.
  }
}

export const isUnlocked = (i: number) => i === 0 || save.stars[i - 1] > 0;

/** Seed for season market i; a new season changes every market. */
export const levelSeed = (i: number) => ((save.seasonSeed * 31 + i * 7919) % 99991) + 1;

/** First market without a star, or the last one once all are cleared. */
export function nextLevel(): number {
  for (let i = 0; i < LEVELS.length; i++) {
    if (!save.stars[i]) return i;
  }
  return LEVELS.length - 1;
}

export function newSeason(): void {
  save.seasonSeed = randomSeed();
  save.stars = [0, 0, 0, 0, 0];
  persist();
}

export const totalStars = () => save.stars.reduce((a, b) => a + b, 0);

/** How far the player has got: finished rounds, plus two for each claim they have ruled on.
 *  This is what brings the author's notes back. */
export const progress = () => save.rounds + 2 * Object.keys(save.claims).length;

/** Counts a finished round and returns the diary entries it brought back. */
export function recordRound(): Entry[] {
  const before = progress();
  save.rounds++;
  persist();
  return newlyUnlocked(before, progress());
}

/** Records a ruling on one of the author's claims and returns the entries it brought back. */
export function recordClaim(id: string, guess: boolean, right: boolean): Entry[] {
  const before = progress();
  save.claims[id] = { guess, right };
  persist();
  return newlyUnlocked(before, progress());
}

/** Adds a finished round to the journal. */
export function recordJournal(entry: JournalEntry): void {
  save.journal.push(entry);
  if (save.journal.length > KEEP) save.journal.splice(0, save.journal.length - KEEP);
  persist();
}
