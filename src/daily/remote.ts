/* The shared daily leaderboard, via the claude.ai artifact runtime (window.claude).
 *
 * Storage: one document per player at daily/{userId}, holding today's run plus up to 30
 * days of history. Opened outside claude.ai there is no window.claude: everything here
 * degrades to "no board" and runs stay in localStorage only. */

import { persist, save, trimDays, type DailyRecord } from '../game/save';
import { todayUTC } from './dates';

interface DocSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface QuerySnapshot {
  docs: DocSnapshot[];
}
interface Query {
  where(field: string, op: '==', value: unknown): Query;
  limit(n: number): Query;
  onSnapshot(next: (snap: QuerySnapshot) => void, error: (e: { code?: string }) => void): () => void;
}
interface ClaudeDb {
  doc(path: string): { get(): Promise<DocSnapshot>; set(data: unknown): Promise<void> };
  collection(path: string): Query;
}
interface ClaudeUser {
  id(): Promise<string>;
  can(permission: string): Promise<boolean>;
  profiles(ids: string[]): Promise<Record<string, { name?: string } | undefined>>;
}
interface ClaudeRuntime {
  use(capability: 'db'): Promise<ClaudeDb>;
  use(capability: 'user'): Promise<ClaudeUser>;
  hot?: {
    snapshot?(fn: () => unknown): void;
    ready?(fn: () => void): void;
    data?: unknown;
  };
}
declare global {
  interface Window {
    claude?: ClaudeRuntime;
  }
}

/** A player's entry on today's board. */
export interface BoardEntry extends Partial<DailyRecord> {
  id: string;
  at?: number;
}

export const remote = {
  db: null as ClaudeDb | null,
  user: null as ClaudeUser | null,
  uid: null as string | null,
  /** null until known; false for view-only access. */
  canWrite: null as boolean | null,
  board: [] as BoardEntry[],
  names: {} as Record<string, string>,
  /** The day the board subscription is for. */
  day: null as string | null,
  /** Our recent daily returns by date, stored alongside today's run. */
  history: {} as Record<string, number | null>,
  ready: false,
  err: null as string | null,
  postErr: null as string | null,
};

let unsubscribe: (() => void) | null = null;
let onChange: () => void = () => {};

/** Registers the re-render callback for board and connection changes. */
export function onRemoteChange(fn: () => void): void {
  onChange = fn;
}

export const canPost = () => !!(remote.db && remote.uid && remote.canWrite !== false && !remote.postErr);

export async function initRemote(): Promise<void> {
  const claude = window.claude;
  if (!claude || typeof claude.use !== 'function') {
    remote.ready = true;
    onChange();
    return;
  }
  try {
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    remote.db = db;
    remote.user = user;
    if (user) {
      remote.uid = await user.id();
      try {
        remote.canWrite = await user.can('data.write');
      } catch {
        // Unknown: try to post and find out.
      }
    }
    if (db && remote.uid) await loadHistory(db, remote.uid);
  } catch {
    // Capabilities unavailable: play offline.
  }
  remote.ready = true;
  subscribeBoard();
  onChange();
}

async function loadHistory(db: ClaudeDb, uid: string): Promise<void> {
  try {
    const snap = await db.doc('daily/' + uid).get();
    const history = snap.exists ? snap.data()?.history : null;
    if (history && typeof history === 'object') remote.history = { ...(history as Record<string, number>) };
  } catch {
    // Start with empty history.
  }
}

/** Subscribes to today's board, re-subscribing when the UTC day rolls over. */
export function subscribeBoard(): void {
  const day = todayUTC();
  if (!remote.db || remote.day === day) return;
  remote.day = day;
  if (unsubscribe) unsubscribe();
  remote.board = [];
  unsubscribe = remote.db
    .collection('daily')
    .where('day', '==', day)
    .limit(500)
    .onSnapshot(
      (snap) => {
        remote.board = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        remote.err = null;
        resolveNames();
        onChange();
      },
      (e) => {
        remote.err = e.code || 'error';
        remote.day = null;
        onChange();
      },
    );
}

async function resolveNames(): Promise<void> {
  if (!remote.user) return;
  const ids = remote.board.map((r) => r.id).filter((id) => !(id in remote.names));
  if (!ids.length) return;
  try {
    const profiles = await remote.user.profiles(ids);
    for (const id of ids) remote.names[id] = profiles?.[id]?.name || '';
    onChange();
  } catch {
    // Names stay "Someone".
  }
}

let postChain = Promise.resolve();

/** Writes our board entry. Posts are chained so they land in order. */
export function postDaily(body: DailyRecord & { at: number }): void {
  const { db, uid } = remote;
  if (!db || !uid || remote.canWrite === false) return;
  const doc = { ...body, history: { ...remote.history } };
  postChain = postChain
    .then(() => db.doc('daily/' + uid).set(doc))
    .then(
      () => {
        remote.postErr = null;
        onChange();
      },
      (e) => {
        remote.postErr = e?.code || 'error';
        if (remote.postErr === 'invalid_argument') remote.canWrite = false;
        onChange();
      },
    );
}

/** Marks today's ranked run as started, so quitting leaves a DNF. */
export function startDailyRun(day: string): void {
  save.daily[day] = { day, status: 'started', ret: null };
  persist();
  postDaily({ day, status: 'started', ret: null, at: Date.now() });
}

export function finishDailyRun(rec: DailyRecord): void {
  save.daily[rec.day] = rec;
  persist();
  remote.history[rec.day] = rec.ret;
  trimDays(remote.history);
  postDaily({ ...rec, at: Date.now() });
}

/** Today's ranked run for this player, from the board or this device. */
export function myDaily(): BoardEntry | DailyRecord | null {
  const day = todayUTC();
  return remote.board.find((r) => r.id === remote.uid && r.day === day) || save.daily[day] || null;
}

export interface BoardRow {
  r: BoardEntry;
  /** null for DNF. */
  rank: number | null;
}

/** Finished runs by return, then unfinished ones. */
export function boardRows(): BoardRow[] {
  const finished = (r: BoardEntry) => r.status === 'done' && typeof r.ret === 'number';
  const done = remote.board.filter(finished).sort((a, b) => (b.ret as number) - (a.ret as number));
  const dnf = remote.board.filter((r) => !finished(r));
  return [...done.map((r, i) => ({ r, rank: i + 1 })), ...dnf.map((r) => ({ r, rank: null }))];
}
