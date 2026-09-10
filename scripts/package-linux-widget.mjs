import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';

rmSync('static/chikota-linux-widget.zip', { force: true });
execFileSync('zip', [
  '-j',
  'static/chikota-linux-widget.zip',
  'linux/chikota_widget.py',
  'linux/install.sh',
  'linux/run-chikota-widget',
  'linux/chikota-widget.desktop',
  'linux/README.md'
]);
