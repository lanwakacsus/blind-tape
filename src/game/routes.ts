/* Where a URL leads. The site is one page, but it answers to paths and hashes like a real one:
 * the files in the index, the pages in the sitemap, and the pages that were never written.
 * Pure: no DOM. */

export const MAIL = 'mhale@blindtape.example';

export type ScreenRoute = 'notes' | 'quotes' | 'claims' | 'journal' | 'archive';

export type Route =
  | { kind: 'title' }
  | { kind: 'screen'; id: ScreenRoute }
  | { kind: 'page'; title: string; body: string; links: string[] };

const SCREENS: Record<string, ScreenRoute> = {
  '/notes': 'notes',
  '/notes.txt': 'notes',
  '/quotes': 'quotes',
  '/quotes.txt': 'quotes',
  '/claims': 'claims',
  '/journal': 'journal',
  '/journal.db': 'journal',
  '/archive': 'archive',
};

/** Pages that were planned and never written. Each one says why. */
const UNWRITTEN: Record<string, string> = {
  '/room': 'this was going to be a page about the room i worked in.\ni did not finish it.',
  '/bar151': 'there is no bar 151.\nthe tape ends at 150.\ni kept checking.',
  '/him': 'no such user.\nthere was no one to make a page for.',
  '/tomorrow': "tomorrow's tape is not available yet.\nit is generated at midnight, utc.\ni used to stay up for it.",
};

const ROBOTS = `# not for indexing
User-agent: *
Disallow: /room
Disallow: /bar151
Disallow: /him
Disallow: /tomorrow`;

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>/</loc><lastmod>2011-03-14</lastmod></url>
  <url><loc>/notes</loc><lastmod>2011-03-14</lastmod></url>
  <url><loc>/quotes</loc><lastmod>2011-03-14</lastmod></url>
  <url><loc>/claims</loc><lastmod>2011-02-02</lastmod></url>
  <url><loc>/archive</loc><lastmod>2011-03-14</lastmod></url>
  <url><loc>/room</loc><lastmod>2011-03-13</lastmod></url>
  <url><loc>/bar151</loc><lastmod>2011-03-14</lastmod></url>
</urlset>`;

/** The path a URL asks for: a #/hash if there is one, otherwise the path. Lower case, no trailing slash. */
export function pathOf(pathname: string, hash: string): string {
  let p = hash.startsWith('#/') ? hash.slice(1) : pathname;
  p = p.split('?')[0].toLowerCase().replace(/\/+$/, '');
  // The page file itself, wherever it is opened from (a deployed site, a dev server, a file on disk).
  if (p === '' || p.endsWith('.html')) return '/';
  return p;
}

export function resolveRoute(pathname: string, hash = ''): Route {
  const path = pathOf(pathname, hash);
  if (path === '/') return { kind: 'title' };
  if (SCREENS[path]) return { kind: 'screen', id: SCREENS[path] };
  if (path === '/robots.txt') return { kind: 'page', title: 'robots.txt', body: ROBOTS, links: ['/room', '/bar151', '/him', '/tomorrow'] };
  if (path === '/sitemap.xml') return { kind: 'page', title: 'sitemap.xml', body: SITEMAP, links: ['/notes', '/quotes', '/claims', '/archive', '/room', '/bar151'] };
  const why = UNWRITTEN[path] ?? `this page has not been written yet.\nif you wanted it written, email me: ${MAIL}`;
  return { kind: 'page', title: '404 not found', body: `${path}\n\n${why}`, links: [] };
}
