// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { classes, fill, h } from '../src/ui/dom';

describe('h()', () => {
  it('inserts strings as text, never as markup', () => {
    const name = '<img src=x onerror="alert(1)">';
    const li = h('li', { class: 'me' }, h('span', { class: 'nm' }, name));
    expect(li.querySelector('img')).toBeNull();
    expect(li.textContent).toBe(name);
    expect(li.innerHTML).toBe('<span class="nm">&lt;img src=x onerror="alert(1)"&gt;</span>');
  });

  it('sets attributes as values, so quotes cannot break out', () => {
    const el = h('div', { title: '"><script>x</script>', 'data-id': 'a"b' });
    expect(el.getAttribute('title')).toBe('"><script>x</script>');
    expect(el.children).toHaveLength(0);
    expect(el.dataset.id).toBe('a"b');
  });

  it('handles boolean attributes, listeners and skipped children', () => {
    const onclick = vi.fn();
    const b = h('button', { disabled: true, hidden: false, onclick }, 'Go', null, false, 3);
    expect(b.hasAttribute('disabled')).toBe(true);
    expect(b.hasAttribute('hidden')).toBe(false);
    expect(b.textContent).toBe('Go3');
    b.disabled = false;
    b.click();
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('fill() replaces children', () => {
    const ol = h('ol', null, h('li', null, 'old'));
    fill(ol, h('li', null, 'a'), h('li', null, 'b'));
    expect(ol.textContent).toBe('ab');
  });

  it('classes() drops empty names', () => {
    expect(classes('node', false, null, 'next', '')).toBe('node next');
  });
});
