# Chikota

A quiet reading room for the links worth keeping. Chikota (from “gather” in Igbo) lets you save, organize, pin, and revisit your favorite websites and articles.

## Run locally

```sh
pnpm install
pnpm dev
```

Open the address printed by Vite. The default is `http://localhost:5173`.

The existing account integration expects these environment variables in `.env`:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/chikota
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
BETTER_AUTH_SECRET=your-auth-secret
BETTER_AUTH_URL=http://localhost:5173
```

Google sign-in and account synchronization require a configured Google OAuth client and the existing PostgreSQL schema. Local bookmarks do not require signing in. No database migration is introduced by this update.

## Your library

- Save an HTTP(S) URL with a title, note, and optional collection.
- Search bookmarks by title or URL in the command menu.
- Browse bookmarks in a compact list ordered from newest to oldest.
- Pin frequently used links and mark articles as read.
- Drag from a row's blank space across bookmarks to select them. Hold Command, Control, or Shift to add to your selection. Checkboxes provide the keyboard and touch alternative.
- Right-click a bookmark for open, edit, copy, pin, read, and delete actions. Right-click the app background for Open Chikota, Save a link, and New collection.
- Choose Paper, Forest, or Ember in Appearance and settings. The preference survives reload without a light-theme flash.
- Export a JSON backup from settings. The backup includes bookmarks, collections, pins, and reading status; automatic import is not implemented.

### Keyboard shortcuts

| Shortcut              | Action                                  |
| --------------------- | --------------------------------------- |
| Command/Control + K   | Open the command menu                   |
| N                     | Save a link, when not typing in a field |
| Command/Control + A   | Select all visible bookmarks            |
| Escape                | Close a menu/dialog or clear selection  |
| Arrow keys, Home, End | Navigate the context menu               |

Native dialogs trap focus and restore it when closed. Motion respects reduced-motion preferences.

### Storage

Without an account, bookmarks live in this browser's local storage. Clearing site data removes them, so export a backup before doing so. Normal and private browser profiles, different browsers, and different origins have separate local libraries. Use the **exact same origin** in the browser extension and the app (`localhost` and `127.0.0.1` are different origins).

When signed in, bookmarks use the existing authenticated API and PostgreSQL database. A failed save keeps the form open and reports the problem. Signing in opens the account library; it does not automatically move local bookmarks into the account.

Collections are currently device-local, matching the existing category storage. Pins and reading status are also device-local and separated by account. Theme preferences are device-local. Local bookmarks synchronize between open tabs on the same origin.

## Browser extension

The Manifest V3 companion supports Chrome and Edge. Install it once to add **Save to Chikota** and **Open Chikota** to the browser's right-click menu. Clicking the toolbar icon also saves the current page.

1. In Chikota, choose **Save from anywhere** and download the extension ZIP. Alternatively use the `extension/` directory directly.
2. Unzip the download.
3. Open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, and click **Load unpacked**.
4. Select the unzipped directory or this repository's `extension/` directory.
5. Open the extension's options and enter your Chikota origin. The default is `http://localhost:5173`.
6. Right-click an ordinary web page or link and choose **Save to Chikota**. Chikota opens in a new tab and automatically saves it. Existing links are detected instead of added twice.

The extension does not scrape pages or require broad host permissions. A link capture uses the destination hostname for its initial title; a page capture uses the tab title. Edit the title in Chikota if desired.

Browser extensions cannot insert menu items into native desktop apps or browser-protected pages. Native-app integration would require a separate operating-system companion. The app must be running or hosted for captures to complete. A failed capture remains in the URL so it can be retried.

Rebuild the downloadable ZIP after changing the extension:

```sh
pnpm extension:build
```

## Development

- SvelteKit 2.70.3, Svelte 5.57.0, Vite 8.2.2
- Tailwind CSS 4.3.3
- `@radix-ui/react-icons` 1.3.2; no Lucide dependencies
- Better Auth, Drizzle ORM, PostgreSQL
- pnpm 10.15.1

Radix publishes React components. `pnpm icons:generate` renders their SVG artwork at development time into native Svelte components. No React runtime is mounted in the UI. Generated icons and the upstream MIT license are checked in under `src/lib/components/icons/radix/`.

```sh
pnpm check
pnpm test
pnpm build
```

The extension tests exercise menu registration, page/link handoff, opening the library, and rejected protocols using a mocked Chrome API. Browser checks covered local create/edit/reload, search, collections, read status, capture/duplicates, themes, mobile layout, drag selection, bulk delete, keyboard menus, and extension download. Google OAuth and writes to a live account database require a configured signed-in session and were not exercised by those checks.
