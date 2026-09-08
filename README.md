# Chikọta

Chikọta means “gather” in Igbo. It is a focused bookmark workspace for organizing saved content and scheduling reminders to return to it.

[View Chikọta live](https://chikota.vercel.app)

<img width="1800" height="1169" alt="Screenshot 2026-09-08 at 3 40 05 PM" src="https://github.com/user-attachments/assets/6818dea5-1e95-4002-bddd-cbd71d0d7709" />

## The product

Saving a link is easy; finding it again is usually the problem. Chikọta keeps the workflow intentionally small: capture a bookmark, organize it, find it quickly, and set a reminder when the content deserves another visit.

- Account creation and authenticated workspaces
- Bookmark creation, editing, and deletion
- Pinned and Category views
- Searchable bookmark grid
- Reminder scheduling and reminder email delivery
- Light and dark appearance settings
- Responsive interaction patterns for desktop and mobile
- Browser Extension

## Stack

- Svelte 5 and SvelteKit
- TypeScript
- Tailwind CSS
- Better Auth
- PostgreSQL and Drizzle ORM
- Resend

## Local development

```bash
pnpm install
pnpm dev
```

Configure the database, authentication, site URL, and email provider values expected by the application before testing authenticated and reminder flows.

## Verify

```bash
pnpm check
pnpm build
```

## License

MIT
