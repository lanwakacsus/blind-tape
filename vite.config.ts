import { renameSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The game is published as one claude.ai artifact, so the build inlines all JS and CSS
// into a single HTML file and names it after the game.
function renameOutput(from: string, to: string): Plugin {
  let outDir = 'dist';
  return {
    name: 'rename-output',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      renameSync(resolve(outDir, from), resolve(outDir, to));
    },
  };
}

export default defineConfig({
  plugins: [viteSingleFile({ removeViteModuleLoader: true }), renameOutput('index.html', 'blind-tape.html')],
  build: {
    modulePreload: { polyfill: false },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
