import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
rmSync('static/chikota-extension.zip', { force: true });
execFileSync('zip', [
  '-j',
  'static/chikota-extension.zip',
  'extension/manifest.json',
  'extension/background.js',
  'extension/options.html',
  'extension/options.js',
  'extension/options.css'
]);
