import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(
  new URL('../extension/background.js', import.meta.url),
  'utf8'
);
function harness(address = 'https://reading.example.com') {
  const events = {};
  const menus = [];
  const opened = [];
  const badges = [];
  const chrome = {
    runtime: {
      onInstalled: {
        addListener: (fn) => {
          events.install = fn;
        }
      }
    },
    storage: { local: { get: async () => ({ chikotaUrl: address }) } },
    contextMenus: {
      removeAll: async () => {
        menus.length = 0;
      },
      create: (item) => menus.push(item),
      onClicked: {
        addListener: (fn) => {
          events.context = fn;
        }
      }
    },
    tabs: { create: async (tab) => opened.push(tab) },
    action: {
      setBadgeText: async (badge) => badges.push(badge.text),
      setTitle: async () => {},
      onClicked: {
        addListener: (fn) => {
          events.action = fn;
        }
      }
    }
  };
  runInNewContext(source, { chrome, URL, console: { error() {} } });
  return { events, menus, opened, badges };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('installation registers both context actions without duplicate menus', async () => {
  const h = harness();
  await h.events.install();
  await h.events.install();
  assert.deepEqual(
    h.menus.map((m) => m.title),
    ['save to chikota', 'open chikota']
  );
});
test('saving a page preserves its URL and title in the app handoff', async () => {
  const h = harness();
  h.events.context(
    {
      menuItemId: 'save-chikota',
      pageUrl: 'https://example.com/article?q=a&b=2'
    },
    { title: 'Reading & curiosity' }
  );
  await settle();
  const url = new URL(h.opened[0].url);
  assert.equal(url.origin, 'https://reading.example.com');
  assert.equal(
    url.searchParams.get('save'),
    'https://example.com/article?q=a&b=2'
  );
  assert.equal(url.searchParams.get('title'), 'Reading & curiosity');
});
test('saving a link chooses the link, not the surrounding page title', async () => {
  const h = harness();
  h.events.context(
    {
      menuItemId: 'save-chikota',
      linkUrl: 'https://linked.example.com/article',
      pageUrl: 'https://page.example.com'
    },
    { title: 'Surrounding page' }
  );
  await settle();
  const url = new URL(h.opened[0].url);
  assert.equal(
    url.searchParams.get('save'),
    'https://linked.example.com/article'
  );
  assert.equal(url.searchParams.get('title'), 'linked.example.com');
});
test('Open Chikota opens the library without saving a page', async () => {
  const h = harness();
  h.events.context({ menuItemId: 'open-chikota' }, {});
  await settle();
  assert.equal(h.opened[0].url, 'https://reading.example.com/');
});
test('protected browser pages and script links are not passed to the app', async () => {
  for (const url of [
    'chrome://extensions',
    'javascript:alert(1)',
    'file:///private/example'
  ]) {
    const h = harness();
    h.events.action({ url, title: 'Restricted page' });
    await settle();
    assert.equal(h.opened.length, 0);
    assert.ok(h.badges.includes('!'));
  }
});
test('an invalid configured app address is reported instead of opened', async () => {
  const h = harness('javascript:alert(1)');
  h.events.context({ menuItemId: 'open-chikota' }, {});
  await settle();
  assert.equal(h.opened.length, 0);
  assert.ok(h.badges.includes('!'));
});
