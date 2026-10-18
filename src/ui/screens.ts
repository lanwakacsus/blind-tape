/* One screen at a time: title → play → debrief, plus the author's notes. */

import { $ } from './dom';

export type ScreenId = 'title' | 'play' | 'debrief' | 'notes' | 'claims' | 'quotes' | 'journal' | 'archive' | 'page';

let current: ScreenId = 'title';
const enterHandlers: Partial<Record<ScreenId, () => void>> = {};

export const currentScreen = () => current;

/** Registers what to do each time a screen is shown. */
export function onEnter(id: ScreenId, fn: () => void): void {
  enterHandlers[id] = fn;
}

export function showScreen(id: ScreenId): void {
  current = id;
  for (const s of ['title', 'play', 'debrief', 'notes', 'claims', 'quotes', 'journal', 'archive', 'page'] as const) $('#' + s).hidden = s !== id;
  enterHandlers[id]?.();
}
