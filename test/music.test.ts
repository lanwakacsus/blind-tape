import { describe, expect, it } from 'vitest';
import { LEVELS, DAILY } from '../src/engine/market';
import { STEPS, bpmFor, pattern } from '../src/game/music';
import { resolveRoute } from '../src/game/routes';

describe('the beat', () => {
  const all = Array.from({ length: STEPS }, (_, i) => pattern(i));

  it('puts a heavy sub on the first step of every bar, a clap on the half bar and hats between', () => {
    for (const bar of [0, 16, 32, 48]) expect(all[bar].some((h) => h.kind === 'sub' && h.vol >= 0.3)).toBe(true);
    for (const half of [8, 24, 40, 56]) expect(all[half].some((h) => h.kind === 'clap')).toBe(true);
    expect(all.filter((s) => s.some((h) => h.kind === 'hat')).length).toBeGreaterThan(30);
  });

  it('keeps every note finite and quiet, and every pitched hit tuned', () => {
    for (const hits of all) for (const h of hits) {
      expect(h.vol).toBeGreaterThan(0);
      expect(h.vol).toBeLessThanOrEqual(0.3);
      if (h.kind === 'sub' || h.kind === 'bell' || h.kind === 'pad') expect(Number.isFinite(h.freq)).toBe(true);
    }
  });

  it('changes root with the chord and loops', () => {
    const roots = [0, 16, 32, 48].map((s) => all[s].find((h) => h.kind === 'sub')!.freq);
    expect(new Set(roots).size).toBe(4);
    expect(pattern(STEPS)).toEqual(pattern(0));
  });

  it('runs faster for faster markets', () => {
    expect(bpmFor(400)).toBeLessThan(bpmFor(200));
    expect(bpmFor(400)).toBe(124);
  });
});

describe('the markets are about something', () => {
  it('gives every level a ticker and an icon, all different', () => {
    const all = [...LEVELS, DAILY];
    expect(new Set(all.map((l) => l.ticker)).size).toBe(all.length);
    expect(LEVELS.map((l) => l.ticker)).toEqual(['GEO', 'RMN', 'KSS', 'DRK', 'TCT']);
    expect(all.every((l) => /^i-/.test(l.icon))).toBe(true);
  });

  it('draws the pages for the shoes and the records', () => {
    for (const p of ['/geobasket', '/ramones', '/kiss-boots', '/drkshdw', '/tecuatl', '/a-great-chaos']) {
      expect((resolveRoute(p) as any).art).toMatch(/^i-/);
    }
    expect((resolveRoute('/room') as any).art).toBeUndefined();
  });
});

import { CHART_PHOTO, PHOTOS, REEL, credit, creditsPage, photo } from '../src/game/credits';

describe('photographs', () => {
  it('credits every photo with an author, a licence and a Commons page', () => {
    expect(PHOTOS).toHaveLength(11);
    for (const p of PHOTOS) {
      expect(p.author.length).toBeGreaterThan(2);
      expect(p.license).toMatch(/^CC/);
      expect(p.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\//);
      expect(p.page).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(credit(p)).toContain(p.author);
      expect(creditsPage()).toContain(p.page);
    }
  });

  it('puts a photo over every market and the daily tape', () => {
    expect(CHART_PHOTO).toHaveLength(LEVELS.length + 1);
    for (const id of CHART_PHOTO) expect(photo(id)).toBeDefined();
  });

  it('serves /credits and shows a photo on the pages about the things in them', () => {
    expect((resolveRoute('/credits') as any).body).toMatch(/freely licensed/);
    for (const p of ['/geobasket', '/dunks', '/rick-owens', '/ken-carson', '/destroy-lonely']) expect((resolveRoute(p) as any).photo).toBeDefined();
  });
});

describe('the reel', () => {
  it('shows only credited photos, each once', () => {
    expect(new Set(REEL).size).toBe(REEL.length);
    for (const id of REEL) expect(credit(photo(id))).toMatch(/photo: .+, CC/);
    expect(new Set(PHOTOS.map((p) => p.id)).size).toBe(PHOTOS.length);
  });
});
