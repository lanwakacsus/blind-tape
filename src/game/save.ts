/* Local progress kept in localStorage: season stars, mute, bot lab settings and the
 * player's own daily runs. Loaded once at startup. */

import { LEVELS } from '../engine/market';
import type { LabSettings } from '../engine/research';
import { STRATS, defaultParams } from '../engine/strategies';

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
  let data: SaveData = { seasonSeed: randomSeed(), stars: [0, 0, 0, 0, 0], muted: false, lab: defaultLab(), daily: {} };
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
