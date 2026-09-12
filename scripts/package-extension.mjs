import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { build } from 'vite';

const outputDirectory = mkdtempSync(join(tmpdir(), 'chikota-extension-'));

await build({
  configFile: false,
  plugins: [tailwindcss()],
  build: {
    emptyOutDir: false,
    outDir: outputDirectory,
    rollupOptions: {
      input: 'extension/options.source.css',
      output: {
        assetFileNames: 'options.css',
        entryFileNames: 'options-tailwind.js'
      }
    }
  }
});

rmSync('static/chikota-extension.zip', { force: true });
execFileSync('zip', [
  '-j',
  'static/chikota-extension.zip',
  'extension/manifest.json',
  'extension/background.js',
  'extension/options.html',
  'extension/options.js',
  join(outputDirectory, 'options.css')
]);
rmSync(outputDirectory, { recursive: true, force: true });
