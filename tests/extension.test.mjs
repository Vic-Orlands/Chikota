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
      onMessage: {
        addListener: (fn) => {
          events.message = fn;
        }
      },
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
const contentSource = await readFile(
  new URL('../extension/content.js', import.meta.url),
  'utf8'
);

test('copy reminder filters text and preserves the clipboard until the user chooses to save', async () => {
  let copy;
  let selection = '';
  const roots = [];
  const created = [];
  const messages = [];
  const makeElement = () => {
    const node = {
      append() {},
      setAttribute() {},
      remove() {},
      attachShadow: () => makeElement()
    };
    created.push(node);
    return node;
  };
  runInNewContext(contentSource, {
    URL,
    HTMLInputElement: class {},
    HTMLTextAreaElement: class {},
    document: {
      activeElement: null,
      addEventListener: (_, callback) => {
        copy = callback;
      },
      createElement: makeElement,
      documentElement: { append: (node) => roots.push(node) }
    },
    window: { getSelection: () => ({ toString: () => selection }) },
    chrome: {
      runtime: {
        sendMessage: async (message) => {
          messages.push(message);
          return { ok: true };
        }
      }
    },
    clearTimeout() {},
    setTimeout() {}
  });
  for (selection of [
    'ordinary text',
    'javascript:alert(1)',
    'file:///private/example'
  ])
    copy({ isTrusted: true });
  assert.equal(roots.length, 0);
  selection = 'https://example.com/copied';
  copy({ isTrusted: false });
  assert.equal(roots.length, 0);
  copy({ isTrusted: true });
  assert.equal(roots.length, 1);
  assert.equal(messages.length, 0);
  await created.find((node) => node.className === 'save').onclick();
  assert.equal(messages[0].url, selection);
});

test('copied URL reminder opens the save form only after its action is selected', async () => {
  const h = harness();
  const responses = [];
  assert.equal(h.opened.length, 0);
  assert.equal(
    h.events.message(
      { type: 'save-copied-link', url: 'https://example.com/copied?q=1' },
      { tab: { id: 7 } },
      (response) => responses.push(response)
    ),
    true
  );
  await settle();
  assert.equal(
    new URL(h.opened[0].url).searchParams.get('save'),
    'https://example.com/copied?q=1'
  );
  assert.equal(responses[0].ok, true);
});

test('copied link messages reject non-web URLs and senders without a tab', async () => {
  const h = harness();
  for (const url of [
    'javascript:alert(1)',
    'file:///private/example',
    'invalid'
  ])
    h.events.message(
      { type: 'save-copied-link', url },
      { tab: { id: 7 } },
      () => {}
    );
  h.events.message(
    { type: 'save-copied-link', url: 'https://example.com' },
    {},
    () => {}
  );
  await settle();
  assert.equal(h.opened.length, 0);
});

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
