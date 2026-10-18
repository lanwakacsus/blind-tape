import { describe, expect, it } from 'vitest';
import { MAIL, pathOf, resolveRoute } from '../src/game/routes';

describe('pathOf', () => {
  it('prefers a #/hash, and ignores case, queries and trailing slashes', () => {
    expect(pathOf('/', '#/Room/')).toBe('/room');
    expect(pathOf('/notes/', '')).toBe('/notes');
    expect(pathOf('/quotes?x=1', '')).toBe('/quotes');
  });

  it('treats the page file itself as the front page, wherever it is opened from', () => {
    expect(pathOf('/Users/me/blind-tape/dist/blind-tape.html', '')).toBe('/');
    expect(pathOf('/C:/games/Blind%20Tape.html', '')).toBe('/');
    expect(resolveRoute('/tmp/x/blind-tape.html')).toEqual({ kind: 'title' });
  });

  it('treats the page itself as the front page', () => {
    for (const p of ['', '/', '/index.html', '/blind-tape.html']) expect(pathOf(p, '')).toBe('/');
    expect(pathOf('/anything', '#section')).toBe('/anything');
  });
});

describe('resolveRoute', () => {
  it('opens the front page and the internal screens by their file names', () => {
    expect(resolveRoute('/')).toEqual({ kind: 'title' });
    expect(resolveRoute('/', '#/notes.txt')).toEqual({ kind: 'screen', id: 'notes' });
    expect(resolveRoute('/archive')).toEqual({ kind: 'screen', id: 'archive' });
    expect(resolveRoute('/journal.db')).toEqual({ kind: 'screen', id: 'journal' });
  });

  it('serves robots.txt and the sitemap, and both point at pages that were never written', () => {
    const robots = resolveRoute('/robots.txt');
    const sitemap = resolveRoute('/', '#/sitemap.xml');
    expect(robots).toMatchObject({ kind: 'page', title: 'robots.txt' });
    expect(sitemap).toMatchObject({ kind: 'page', title: 'sitemap.xml' });
    for (const link of [...(robots as any).links, ...(sitemap as any).links.filter((l: string) => ['/room', '/bar151'].includes(l))]) {
      expect(resolveRoute(link)).toMatchObject({ kind: 'page', title: '404 not found' });
    }
  });

  it('gives each unwritten page its own reason', () => {
    const body = (p: string) => (resolveRoute(p) as any).body as string;
    expect(body('/bar151')).toMatch(/there is no bar 151/);
    expect(body('/room')).toMatch(/did not finish it/);
    expect(body('/him')).toMatch(/no such user/);
    expect(body('/tomorrow')).toMatch(/midnight, utc/);
    expect(body('/geobasket')).toMatch(/a page about a shoe/);
    expect(body('/ken-carson')).toMatch(/he is very loud/);
    expect(body('/destroy-lonely')).toMatch(/it is an instruction/);
    expect(body('/rick-owens')).toMatch(/it has no front/);
    const pages = ['/room', '/bar151', '/him', '/tomorrow', '/geobasket', '/ken-carson', '/destroy-lonely', '/rick-owens'];
    expect(new Set(pages.map(body)).size).toBe(pages.length);
  });

  it('has a page for every record, shoe and name he fixated on, all different and all disallowed', () => {
    const paths = ['/a-great-chaos', '/more-chaos', '/project-x', '/x', '/teen-x', '/no-stylist', '/if-looks-could-kill', '/opium', '/ramones', '/kiss-boots', '/drkshdw', '/tecuatl', '/dunks', '/lookbook', '/runway', '/stylist', '/cart', '/wishlist', '/merch', '/tickets', '/tour', '/size-chart', '/dress-code', '/sold-out', '/restock', '/backstage', '/listening'];
    const body = (p: string) => (resolveRoute(p) as any).body as string;
    const bodies = paths.map(body);
    expect(new Set(bodies).size).toBe(paths.length);
    expect(bodies.every((b) => !/this page has not been written yet/.test(b))).toBe(true);
    const robots = body('/robots.txt');
    for (const p of paths) expect(robots).toContain(`Disallow: ${p}`);
  });

  it('serves a playlist of album titles, and no lyrics', () => {
    const r = resolveRoute('/', '#/playlist.m3u') as any;
    expect(r).toMatchObject({ kind: 'page', title: 'playlist.m3u' });
    for (const title of ['a great chaos', 'more chaos', 'no stylist']) expect(r.body).toContain(title);
    expect(r.body.split('\n').length).toBeLessThan(20);
  });

  it('echoes any other path and invites an email', () => {
    const r = resolveRoute('/nothing-here') as any;
    expect(r.title).toBe('404 not found');
    expect(r.body).toContain('/nothing-here');
    expect(r.body).toContain(MAIL);
  });

  it('only ever lists links that lead somewhere', () => {
    for (const p of ['/robots.txt', '/sitemap.xml']) {
      for (const link of (resolveRoute(p) as any).links) expect(resolveRoute(link).kind).not.toBe('title');
    }
  });
});
