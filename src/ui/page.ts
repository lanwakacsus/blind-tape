/* Files and pages that are not part of the game: robots.txt, the sitemap, and the 404s. */

import { resolveRoute } from '../game/routes';
import { credit, photo } from '../game/credits';
import { $, fill, h, icon } from './dom';
import { SRC } from './photos';
import { currentScreen, showScreen } from './screens';

/** Shows whatever the address bar asks for. */
export function applyRoute(): void {
  const route = resolveRoute(location.pathname, location.hash);
  if (route.kind === 'title') {
    if (currentScreen() === 'page') showScreen('title');
    return;
  }
  if (route.kind === 'screen') {
    showScreen(route.id);
    return;
  }
  fill($('#pageTitle'), route.title);
  $('#pageBody').textContent = route.body;
  fill(
    $('#pageArt'),
    ...(route.photo
      ? [h('img', { class: 'photo-img', src: SRC[route.photo], alt: photo(route.photo).label }), h('div', { class: 'cap' }, credit(photo(route.photo)))]
      : route.art
      ? [icon(route.art, 'icon big')]
      : []),
  );
  fill($('#pageLinks'), ...route.links.map((l) => h('a', { href: '#' + l }, l)));
  showScreen('page');
}

function goHome(): void {
  try {
    history.pushState(null, '', location.protocol === 'file:' ? location.href.split('#')[0] : '/');
  } catch {
    // Some hosts do not allow it: the title screen still shows.
  }
  showScreen('title');
}

export function initPage(): void {
  window.addEventListener('hashchange', applyRoute);
  window.addEventListener('popstate', applyRoute);
  $('#pageBack').addEventListener('click', goHome);
}
