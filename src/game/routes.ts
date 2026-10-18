/* Where a URL leads. The site is one page, but it answers to paths and hashes like a real one:
 * the files in the index, the pages in the sitemap, and the pages that were never written.
 * Pure: no DOM. */

import { creditsPage, type Photo } from './credits';

export const MAIL = 'mhale@blindtape.example';

export type ScreenRoute = 'notes' | 'quotes' | 'claims' | 'journal' | 'archive';

export type Route =
  | { kind: 'title' }
  | { kind: 'screen'; id: ScreenRoute }
  | { kind: 'page'; title: string; body: string; links: string[]; art?: string; photo?: Photo['id'] };

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
  '/geobasket': `this was going to be a page about a shoe.
they are very large. i could not photograph them.

        ______
       /      \\___
   ___/  ____      \\___
  /     /    \\        \\
 |_____/      \\________|
 |____________________|

(drawn from memory. size 43.)`,
  '/ken-carson': 'no such user.\nthere is a user. he is not on this server.\nhe is very loud.',
  '/destroy-lonely': 'this is not a page. it is an instruction.\ni have not followed it.',
  '/rick-owens': 'this page is a drape.\nit has no front.\nit has no back either.',
  '/a-great-chaos': "a great chaos.\nthis page was going to be a review.\ni cannot review it. i can only report that it is on.\nit has been on since january. it is not out yet.",
  '/more-chaos': "more chaos.\nthere is no page for this because it is not out yet.\nthere is an mp3. it is on the desktop. do not ask.",
  '/project-x': "project x.\nthe first one. the one before the rest.\ni have it. i have the one before that. there is not one before that.",
  '/x': "x.\none letter. one page. nothing on it.\nthat was the point.",
  '/teen-x': "teen x.\nplayed on the 4th of march from 03:10 to 03:51.\nthe tape was at bar 88. it was the same bar.",
  '/no-stylist': "no stylist.\ni did not have one. i had a tape.\nthe tape had no opinions about the shoes.\nit had opinions about the shoes.",
  '/if-looks-could-kill': "if looks could kill.\nthe record is not on this server.\ni looked at the server for a long time.\nthe server is fine.",
  '/destroy-lonely-2': "this page does not exist. there was only ever one.",
  '/opium': "opium.\nthis page is a label.\nit is also a mood. it is also a drawer in the hall.",
  '/ramones': "ramones low.\nsize 43. black. sold out.\nthe family is in the hall. this is the only one that looks at the door.",
  '/kiss-boots': "kiss boots.\nsold out.\nthey are taller than the monitor.\ni cannot sit down in them. i sit down in them.",
  '/drkshdw': "drkshdw.\nthe hoodie arrived in a bag with no name on it.\nthe name was on the bag. it was my name.\nthe bag was black.",
  '/tecuatl': "tecuatl.\ni wear them at the desk.\nthe tape is brighter. the tape is not brighter.\nit is not a good idea to look at the tape this much.",
  '/dunks': "dunks.\nthere is a pair that is not a pair.\nit is two left shoes. i did not return them.",
  '/lookbook': "lookbook.\nthere are no photographs.\nthere are the clothes, and the room, and me, and the clothes again.",
  '/runway': "runway.\nthe show starts at 03:00 and has no audience.\nthe audience is a monitor.\nit applauds in green and red.",
  '/stylist': "this is not a stylist. this is a text file.\nit says: wear black.\nit has said it since august.",
  '/cart': "your cart is empty.\nit was not empty. it was full. it is the server's now.\ntotal: more than the server.",
  '/wishlist': "wishlist:\n- geobasket (owned)\n- ramones low (owned)\n- kiss boots (owned)\n- a great chaos (owned, not out)\n- more chaos (owned, not out)\n- a friend (not available in 43)",
  '/merch': "merch.\ni do not sell anything.\nthere is a shop. it is not mine. i go there. it is closed.",
  '/tickets': "tickets.\nsold out in 3 minutes. the minutes were mine.\nthe venue is a number. the number is the bar.",
  '/tour': "tour dates.\n  03:00  the desk\n  03:17  the desk\n  04:44  the hall\n\nthere is no support act.",
  '/size-chart': "size chart.\n  43  me\n  43  the shoes\n  43  the tape\n\nnothing else comes in my size.",
  '/dress-code': "dress code.\nblack. the hem long. the sunglasses on.\nno photographs. no stylist. no one.\ndo not dress for the tape. the tape dresses you.",
  '/sold-out': "everything is sold out.\nthis page was a shop for a minute.\nit has been an apology since.",
  '/restock': "restock: never.\ni refreshed it 600 times. it is never 11.",
  '/backstage': "backstage is not open to the public.\nit is not open to me either.\ni am in the hall, outside it, with the family.",
  '/listening': "now playing: a great chaos.\nplays this week: 211.\nthe same song, 14 times, at 03:17.\nthe counter is correct.",
};

/** Pages that have a drawing, by symbol id (see index.html). */
const ART: Record<string, string> = {
  '/geobasket': 'i-geobasket',
  '/ramones': 'i-ramones',
  '/kiss-boots': 'i-kiss',
  '/drkshdw': 'i-drk',
  '/tecuatl': 'i-tecuatl',
  '/a-great-chaos': 'i-record',
  '/more-chaos': 'i-record',
  '/project-x': 'i-record',
  '/x': 'i-record',
  '/teen-x': 'i-record',
  '/no-stylist': 'i-record',
  '/if-looks-could-kill': 'i-record',
  '/listening': 'i-record',
  '/lookbook': 'i-drk',
  '/dunks': 'i-ramones',
  '/rick-owens': 'i-drk',
  '/ken-carson': 'i-record',
  '/destroy-lonely': 'i-record',
};

/** Pages that show a photograph (see game/credits.ts). */
const PHOTO: Record<string, Photo['id']> = {
  '/geobasket': 'geobasket',
  '/dunks': 'dunk',
  '/rick-owens': 'rick',
  '/ken-carson': 'ken',
  '/destroy-lonely': 'lonely',
};

const ROBOTS = `# not for indexing
User-agent: *
Disallow: /room
Disallow: /bar151
Disallow: /him
Disallow: /tomorrow
Disallow: /geobasket
Disallow: /ken-carson
Disallow: /destroy-lonely
Disallow: /rick-owens
Disallow: /a-great-chaos
Disallow: /more-chaos
Disallow: /project-x
Disallow: /x
Disallow: /teen-x
Disallow: /no-stylist
Disallow: /if-looks-could-kill
Disallow: /destroy-lonely-2
Disallow: /opium
Disallow: /ramones
Disallow: /kiss-boots
Disallow: /drkshdw
Disallow: /tecuatl
Disallow: /dunks
Disallow: /lookbook
Disallow: /runway
Disallow: /stylist
Disallow: /cart
Disallow: /wishlist
Disallow: /merch
Disallow: /tickets
Disallow: /tour
Disallow: /size-chart
Disallow: /dress-code
Disallow: /sold-out
Disallow: /restock
Disallow: /backstage
Disallow: /listening`;

const PLAYLIST = `#EXTM3U
# in order of how often i fall asleep to them
a great chaos
more chaos
project x
x
no stylist
if looks could kill
teen x
project x (again)
a great chaos (again)
# the shoes are not on this list. they are on the floor
# do not play these through the server`;

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>/</loc><lastmod>2011-03-14</lastmod></url>
  <url><loc>/notes</loc><lastmod>2011-03-14</lastmod></url>
  <url><loc>/quotes</loc><lastmod>2011-03-14</lastmod></url>
  <url><loc>/claims</loc><lastmod>2011-02-02</lastmod></url>
  <url><loc>/archive</loc><lastmod>2011-03-14</lastmod></url>
  <url><loc>/room</loc><lastmod>2011-03-13</lastmod></url>
  <url><loc>/bar151</loc><lastmod>2011-03-14</lastmod></url>
  <url><loc>/geobasket</loc><lastmod>2011-03-07</lastmod></url>
  <url><loc>/a-great-chaos</loc><lastmod>2011-03-14</lastmod></url>
  <url><loc>/no-stylist</loc><lastmod>2011-03-03</lastmod></url>
  <url><loc>/size-chart</loc><lastmod>2011-03-09</lastmod></url>
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
  if (path === '/robots.txt') return { kind: 'page', title: 'robots.txt', body: ROBOTS, links: ['/room', '/bar151', '/him', '/tomorrow', '/geobasket', '/ken-carson', '/destroy-lonely', '/rick-owens'] };
  if (path === '/sitemap.xml') return { kind: 'page', title: 'sitemap.xml', body: SITEMAP, links: ['/notes', '/quotes', '/claims', '/archive', '/room', '/bar151'] };
  if (path === '/credits') return { kind: 'page', title: 'credits', body: creditsPage(), links: [] };
  if (path === '/playlist.m3u') return { kind: 'page', title: 'playlist.m3u', body: PLAYLIST, links: [] };
  const why = UNWRITTEN[path] ?? `this page has not been written yet.\nif you wanted it written, email me: ${MAIL}`;
  return { kind: 'page', title: '404 not found', body: `${path}\n\n${why}`, links: [], art: ART[path], photo: PHOTO[path] };
}
