import { test } from 'node:test';
import assert from 'node:assert/strict';
import { domain, safeUrl } from '../src/lib/links.ts';
import {
  isMenuSeparator,
  menuLabel,
  visibleMenuEntries
} from '../src/lib/menu.ts';
import {
  RECENT_OPEN_WINDOW_MS,
  belongsOnWidget,
  desktopWidgetErrorMessage,
  desktopWidgetToast,
  desktopWidgetToggleLabel,
  hasActiveReminder,
  isRecentOpen
} from '../src/lib/widget-membership.ts';
import { MAX_BULK_IDS, parseBulkIds } from '../src/lib/server/bulk-ids.ts';

const now = Date.parse('2026-09-12T12:00:00.000Z');

test('safeUrl accepts http(s) and adds a scheme when missing', () => {
  assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(safeUrl('http://localhost:5173'), 'http://localhost:5173/');
  assert.equal(safeUrl('reading.example.com/path'), 'https://reading.example.com/path');
});

test('safeUrl rejects non-http schemes and hostless values', () => {
  assert.throws(() => safeUrl('javascript:alert(1)'));
  assert.throws(() => safeUrl('not-a-host'), /valid http or https/);
  assert.throws(() => safeUrl(''), /Invalid URL/);
});

test('domain strips www and falls back to the raw value', () => {
  assert.equal(domain('https://www.example.com/path'), 'example.com');
  assert.equal(domain('https://reading.example.com'), 'reading.example.com');
  assert.equal(domain('not a url'), 'not a url');
});

test('menu helpers resolve visibility, labels, and separators', () => {
  const entries = [
    { id: 'open', label: 'open bookmark', run() {} },
    { id: 'hidden', label: 'secret', visible: false, run() {} },
    {
      id: 'pin',
      label: () => 'unpin bookmark',
      visible: () => true,
      run() {}
    },
    { id: 'sep', separator: true },
    { id: 'gone-sep', separator: true, visible: () => false }
  ];
  const visible = visibleMenuEntries(entries);
  assert.deepEqual(
    visible.map((entry) => entry.id),
    ['open', 'pin', 'sep']
  );
  assert.equal(menuLabel(visible[1]), 'unpin bookmark');
  assert.equal(isMenuSeparator(visible[2]), true);
  assert.equal(isMenuSeparator(visible[0]), false);
});

test('isRecentOpen matches the seven-day window and rejects the future', () => {
  assert.equal(isRecentOpen(new Date(now - 1_000), now), true);
  assert.equal(isRecentOpen(now - RECENT_OPEN_WINDOW_MS, now), true);
  assert.equal(isRecentOpen(now - RECENT_OPEN_WINDOW_MS - 1, now), false);
  assert.equal(isRecentOpen(now + 1_000, now), false);
  assert.equal(isRecentOpen('', now), false);
  assert.equal(isRecentOpen(undefined, now), false);
});

test('hasActiveReminder is only true for a future reminder', () => {
  assert.equal(hasActiveReminder(new Date(now + 60_000).toISOString(), now), true);
  assert.equal(hasActiveReminder(now, now), false);
  assert.equal(hasActiveReminder(now - 1, now), false);
  assert.equal(hasActiveReminder(null, now), false);
});

test('belongsOnWidget is pin ∪ recent ∪ active reminder ∪ widgetEnabled', () => {
  assert.equal(belongsOnWidget({ widgetEnabled: true }, now), true);
  assert.equal(belongsOnWidget({ isPinned: true }, now), true);
  assert.equal(
    belongsOnWidget({ openedAt: new Date(now - 3_600_000) }, now),
    true
  );
  assert.equal(
    belongsOnWidget({ reminderAt: new Date(now + 3_600_000) }, now),
    true
  );
  assert.equal(
    belongsOnWidget({ reminderAt: new Date(now - 3_600_000) }, now),
    false
  );
  assert.equal(belongsOnWidget({}, now), false);
});

test('desktop widget copy is platform-neutral', () => {
  assert.equal(desktopWidgetToggleLabel(false), 'add to desktop widget');
  assert.equal(desktopWidgetToggleLabel(true), 'remove from desktop widget');
  assert.equal(desktopWidgetToast(false), 'added to desktop widget');
  assert.equal(desktopWidgetToast(true), 'removed from desktop widget');
  assert.match(desktopWidgetErrorMessage, /desktop widget/);
});

test('parseBulkIds accepts a unique string list', () => {
  assert.deepEqual(parseBulkIds({ ids: ['a', 'b', 'a'] }), {
    ok: true,
    ids: ['a', 'b']
  });
});

test('parseBulkIds rejects empty, oversized, and invalid payloads', () => {
  assert.equal(parseBulkIds(null).ok, false);
  assert.equal(parseBulkIds({ ids: [] }).ok, false);
  assert.equal(parseBulkIds({ ids: [''] }).ok, false);
  assert.equal(parseBulkIds({ ids: [1] }).ok, false);
  assert.equal(
    parseBulkIds({ ids: Array.from({ length: MAX_BULK_IDS + 1 }, (_, i) => String(i)) })
      .ok,
    false
  );
});
