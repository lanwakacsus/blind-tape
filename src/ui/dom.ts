/* Tiny DOM helpers. Everything rendered from data goes through h(), which sets text with
 * text nodes and attributes with setAttribute, so user-provided strings are never parsed
 * as HTML. */

export function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

/** Like $, but returns null when nothing matches. */
export function find<T extends HTMLElement = HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

export function $$<T extends HTMLElement = HTMLElement>(selector: string): T[] {
  return [...document.querySelectorAll<T>(selector)];
}

export type Child = Node | string | number | null | undefined | false;
type AttrValue = string | number | boolean | null | undefined;
export type Attrs = { [name: string]: AttrValue | ((e: Event) => void) };

/** Creates an element. Attributes: `class` and plain names are set as attributes (false,
 *  null and undefined are skipped, true sets an empty attribute); `on<event>` functions
 *  become listeners. Children: strings and numbers become text nodes. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (typeof value === 'function') {
      el.addEventListener(name.slice(2).toLowerCase(), value);
    } else if (value != null && value !== false) {
      el.setAttribute(name, value === true ? '' : String(value));
    }
  }
  append(el, children);
  return el;
}

/** Replaces an element's children. */
export function fill(el: Element, ...children: Child[]): void {
  el.replaceChildren();
  append(el, children);
}

function append(el: Element, children: Child[]): void {
  for (const c of children) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
}

/** Space-joins class names, dropping empty ones. */
export function classes(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

/** <kbd> shortcut. */
export const kbd = (key: string) => h('kbd', null, key);
