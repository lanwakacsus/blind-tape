// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** An audio param or node that accepts anything and does nothing. */
function stub(): any {
  const own: Record<string, unknown> = {};
  return new Proxy(function () {} as any, {
    get(_t, key: string) {
      if (key === 'connect') return (n: unknown) => n;
      if (key === 'getChannelData') return (_: number) => new Float32Array(4);
      return (own[key] ??= typeof key === 'string' && /^(set|linear|exponential|cancel|start|stop|disconnect)/.test(key) ? vi.fn() : stub());
    },
    set(_t, key: string, v) {
      own[key] = v;
      return true;
    },
    apply: () => undefined,
  });
}

let made = 0;
class FakeAudio {
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  destination = stub();
  constructor() {
    made++;
  }
  resume = () => Promise.resolve();
  createBuffer = (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) });
  createGain = stub;
  createOscillator = stub;
  createBiquadFilter = stub;
  createDynamicsCompressor = stub;
  createConvolver = stub;
  createWaveShaper = stub;
  createBufferSource = stub;
}

beforeEach(() => {
  made = 0;
  vi.resetModules();
  vi.stubGlobal('AudioContext', FakeAudio);
  (window as any).AudioContext = FakeAudio;
});
afterEach(() => vi.unstubAllGlobals());

const everySound = (sfx: Record<string, (...a: any[]) => void>) => {
  sfx.count(3);
  sfx.count(1);
  sfx.go();
  sfx.enter(true);
  sfx.enter(false);
  sfx.flat();
  sfx.win(1);
  sfx.win(9);
  sfx.loss();
  sfx.stop();
  sfx.gapUp();
  sfx.gapDown();
  sfx.plunge();
  sfx.surge();
  sfx.lead();
  sfx.headline();
  sfx.leak();
  sfx.denied();
  sfx.over();
};

describe('sfx', () => {
  it('plays every sound without throwing', async () => {
    const { sfx } = await import('../src/game/sound');
    expect(() => everySound(sfx)).not.toThrow();
    expect(made).toBe(1);
  });

  it('stays completely silent when muted, without even starting audio', async () => {
    const { save } = await import('../src/game/save');
    const { sfx } = await import('../src/game/sound');
    save.muted = true;
    everySound(sfx);
    expect(made).toBe(0);
  });

  it('carries on silently if audio is not available', async () => {
    (window as any).AudioContext = undefined;
    vi.stubGlobal('AudioContext', undefined);
    const { sfx } = await import('../src/game/sound');
    expect(() => everySound(sfx)).not.toThrow();
  });
});
