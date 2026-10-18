// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/** A canvas context that accepts any call and any assignment. */
const fakeContext = (): any =>
  new Proxy({} as any, {
    get(target, key: string) {
      if (key === 'measureText') return () => ({ width: 10 });
      if (key in target) return target[key];
      return () => ({});
    },
    set(target, key: string, v) {
      target[key] = v;
      return true;
    },
  });

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T;

let mod: {
  showScreen: (id: any) => void;
  game: { round: any };
  startRound: (...a: any[]) => void;
  goLive: (r: any) => void;
  advance: (r: any, now: number) => void;
  setPos: (d: any) => void;
  setTarget: (t: number) => void;
  setStop: (s: number) => void;
  showDebrief: (r: any) => void;
  drawLive: (c: HTMLCanvasElement, r: any) => void;
  genMarket: (s: number, o?: any) => any;
  save: any;
  syncPad: () => void;
  stopRound: () => void;
  setSizeFn: (s: number) => void;
};

beforeAll(async () => {
  const html = readFileSync('index.html', 'utf8');
  document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;

  (window as any).matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  (window as any).ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  HTMLCanvasElement.prototype.getContext = (() => fakeContext()) as any;
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { get: () => 800 });
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { get: () => 400 });
  vi.stubGlobal('requestAnimationFrame', () => 0);

  await import('../src/main');
  const [screens, round, debrief, live, market, save, play] = await Promise.all([
    import('../src/ui/screens'),
    import('../src/game/round'),
    import('../src/ui/debrief'),
    import('../src/render/liveChart'),
    import('../src/engine/market'),
    import('../src/game/save'),
    import('../src/ui/play'),
  ]);
  mod = {
    showScreen: screens.showScreen,
    game: round.game,
    startRound: round.startRound,
    goLive: round.goLive,
    advance: round.advance,
    setPos: round.setPos,
    setTarget: round.setTarget,
    setStop: round.setStop,
    showDebrief: debrief.showDebrief,
    drawLive: live.drawLive,
    genMarket: market.genMarket,
    save: save.save,
    syncPad: play.syncPad,
    stopRound: round.stopRound,
    setSizeFn: round.setSize,
  };
});

describe('the front page is dense, and its file index works', () => {
  it('is wide enough for three columns', () => {
    expect($('.title-inner').classList.contains('wide')).toBe(true);
    expect(document.querySelectorAll('.cols > .rail, .cols > .center')).toHaveLength(3);
  });

  it('has a file index, a status panel, a changelog, known issues, a todo list and a raw seed dump', () => {
    mod.showScreen('title');
    expect($('#fileList').children).toHaveLength(9);
    expect($('#statusBox').children).toHaveLength(7);
    expect($('#statusBox').textContent).toMatch(/last login.*14 Mar 2011 03:17/);
    expect($('#rawSeeds').textContent!.split('\n')).toHaveLength(24);
    expect($('#rawSeeds').textContent).toMatch(/^2011-02-19 [0-9a-f]{8} (---|d\d{3})/);
    expect(document.querySelectorAll('.changelog li')).toHaveLength(7);
    expect(document.querySelectorAll('.rail .todo li.done').length).toBe(3);
  });

  it('opens a screen from the file index', () => {
    mod.showScreen('title');
    const notes = [...document.querySelectorAll<HTMLButtonElement>('#fileList button')].find((b) => b.textContent === 'notes.txt')!;
    notes.click();
    expect($('#notes').hidden).toBe(false);
    expect($('#title').hidden).toBe(true);
    mod.showScreen('title');
  });
});

describe('pages that were never written', () => {
  const go = (hash: string) => {
    location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  it('shows robots.txt from the file index and links onward to the pages it hides', () => {
    mod.showScreen('title');
    const robots = [...document.querySelectorAll<HTMLButtonElement>('#fileList button')].find((b) => b.textContent === 'robots.txt')!;
    robots.click();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect($('#page').hidden).toBe(false);
    expect($('#pageTitle').textContent).toBe('robots.txt');
    expect($('#pageBody').textContent).toMatch(/Disallow: \/bar151/);
    expect(document.querySelectorAll('#pageLinks a')).toHaveLength(4);
  });

  it('answers an unwritten page in his voice, and any other path with a plain 404', () => {
    go('#/bar151');
    expect($('#pageTitle').textContent).toBe('404 not found');
    expect($('#pageBody').textContent).toMatch(/there is no bar 151/);
    go('#/somewhere-else');
    expect($('#pageBody').textContent).toMatch(/somewhere-else/);
    expect($('#pageBody').textContent).toMatch(/mhale@blindtape\.example/);
  });

  it('opens an internal screen by file name, and returns to the front page', () => {
    go('#/archive');
    expect($('#archive').hidden).toBe(false);
    go('#/');
    ($('#pageBack') as HTMLButtonElement).click();
    expect($('#title').hidden).toBe(false);
    location.hash = '';
  });

  it('asks to be written to, in the page and in the contact panel', () => {
    expect($('.about').textContent).toMatch(/I would like to meet everyone who plays this/);
    expect($('.about').textContent).toMatch(/I used to answer every email/);
    expect(document.querySelectorAll('a[href^="mailto:mhale@blindtape.example"]').length).toBeGreaterThanOrEqual(3);
    const head = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html').head;
    expect(head.querySelector('meta[name="robots"]')!.getAttribute('content')).toMatch(/noindex/);
  });
});

describe('every screen renders from the real page', () => {
  it('the title page has the author, his log, the seed log and the greeting', () => {
    mod.showScreen('title');
    expect($('#postList').children.length).toBeGreaterThan(0);
    expect($('#seedBody').children).toHaveLength(14);
    expect($('#boot').children.length).toBeGreaterThanOrEqual(3);
    expect($('#epigraph').textContent).toMatch(/trend is your friend/);
    expect($('#season').children).toHaveLength(5);
    expect($('#sitefoot').textContent).toMatch(/last updated 14 March 2011/);
  });

  it('the notes, quotes, claims, journal and archive screens all fill in', () => {
    mod.showScreen('notes');
    expect($('#notesEntries').children.length).toBeGreaterThan(0);
    mod.showScreen('quotes');
    expect($('#quoteList').children).toHaveLength(24);
    mod.showScreen('claims');
    expect($('#claimsList').children).toHaveLength(9);
    mod.showScreen('journal');
    expect($('#journalTiles').children.length).toBeGreaterThan(5);
    mod.showScreen('archive');
    expect($('#archiveBody').children).toHaveLength(224);
  });

  it('only one screen is ever visible', () => {
    for (const id of ['title', 'notes', 'quotes', 'claims', 'journal', 'archive']) {
      mod.showScreen(id);
      const visible = [...document.querySelectorAll<HTMLElement>('.screen')].filter((s) => !s.hidden).map((s) => s.id);
      expect(visible).toEqual([id]);
    }
  });
});

describe('getting set before a round', () => {
  it('waits for Start, and Start begins the countdown', () => {
    mod.startRound(mod.genMarket(5), 0, 'season');
    const r = mod.game.round;
    expect(r.phase).toBe('ready');
    expect($('#overlay').classList.contains('ready')).toBe(true);
    expect($('#overlay .ready-card')).not.toBeNull();
    ($('#overlay .start') as HTMLButtonElement).click();
    expect(r.phase).toBe('countdown');
    expect($('#overlay').classList.contains('ready')).toBe(false);
    mod.stopRound();
  });
});

describe('sound can be muted', () => {
  it('has a mute button in the play screen, and no piano note', () => {
    expect($('#muteBtn')).not.toBeNull();
    expect($('.about').textContent).not.toMatch(/piano/i);
    expect(document.querySelector('.nomute')).toBeNull();
  });
});

describe('the controls', () => {
  it('has size, stop, target and indicator controls and no resting-order controls', () => {
    expect(document.querySelectorAll('[data-size]')).toHaveLength(3);
    expect(document.querySelectorAll('[data-stop]')).toHaveLength(4);
    expect(document.querySelectorAll('[data-target]')).toHaveLength(4);
    expect(document.querySelectorAll('[data-ind]')).toHaveLength(5);
    expect(document.querySelectorAll('[data-order], [data-offset], #cancelBtn, #orderChip')).toHaveLength(0);
  });

  it('shows the reward against risk once both a stop and a target are set', () => {
    mod.startRound(mod.genMarket(11), null, 'practice');
    const r = mod.game.round;
    mod.goLive(r);
    mod.syncPad();
    expect($('#rrNote').textContent).toBe('');
    mod.setStop(0.05);
    mod.setTarget(0.1);
    mod.syncPad();
    expect($('#rrNote').textContent).toBe('2.0 : 1  \u00b7  you need to win 33% to break even');
    expect(document.querySelector('[data-target="0.1"]')!.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('a whole round, with everything switched on', () => {
  it('plays to the end, draws the chart with every indicator, and opens a full debrief', () => {
    mod.save.indicators = { ma: true, bb: true, vol: true, rsi: true, atr: true };
    const journalBefore = mod.save.journal.length;
    mod.startRound(mod.genMarket(2024), 2, 'season');
    const r = mod.game.round;
    mod.goLive(r);
    mod.setStop(0.05);
    mod.setTarget(0.06);
    mod.setPos(1);

    r.fast = true;
    const canvas = $<HTMLCanvasElement>('#live');
    let t = 0;
    for (let i = 0; i < 200000 && r.phase === 'run'; i++) {
      mod.advance(r, (t += 16));
      if (i % 40 === 0) mod.drawLive(canvas, r);
      if (i === 300) {
        mod.setPos(-1);
        mod.setPos(0);
      }
    }
    expect(r.phase).toBe('over');
    mod.drawLive(canvas, r);

    mod.showDebrief(r);
    expect($('#debrief').hidden).toBe(false);
    expect($('#reviewTiles').children).toHaveLength(9);
    expect($('#reviewBody').children).toHaveLength(r.closedTrades.length);
    expect($('#reviewNotes').children.length).toBeGreaterThan(0);
    expect($('#tbody').children.length).toBeGreaterThanOrEqual(8);
    expect(mod.save.journal.length).toBe(journalBefore + 1);
    expect(mod.save.journal.at(-1).market).toMatch(/Market 3/);
  });

  it('replays an archive tape in archive mode without touching the daily board', () => {
    mod.showScreen('archive');
    ($('#archiveBody button') as HTMLButtonElement).click();
    const r = mod.game.round;
    expect(r.mode).toBe('archive');
    expect(r.m.day).toBeTruthy();
    expect($('#play').hidden).toBe(false);
    expect($('#lvlName').textContent).toBe('ARCHIVE');
  });
});
