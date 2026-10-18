import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The tests do not process CSS, so a bad edit to it would otherwise only show up as a failed build. */
describe('styles.css', () => {
  const css = readFileSync('src/styles.css', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');

  it('has balanced braces and never closes a block that is not open', () => {
    let depth = 0;
    for (const ch of css) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      expect(depth).toBeGreaterThanOrEqual(0);
    }
    expect(depth).toBe(0);
  });

  it('never leaves a media query open across the next rule', () => {
    // An @media block must contain at least one complete rule before it closes.
    expect(/@media[^{]*\{\s*(?:\/\*.*?\*\/\s*)?[^{}]*\{[^{}]*\}\s*\}/.test(css)).toBe(true);
    expect(/@media[^{]*\{\s*\}/.test(css)).toBe(false);
  });

  it('has no rule that ends where another begins', () => {
    expect(/\}\s*[^{}\s@][^{}]*\}/.test(css.replace(/@media[^{]*\{/g, '').replace(/@keyframes[^{]*\{/g, ''))).toBe(false);
  });
});
