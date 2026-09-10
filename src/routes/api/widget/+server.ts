import { json } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { bookmarks } from '$lib/db/schema';
import { widgetUser } from '$lib/server/widget-auth';

export const GET = async ({ request }) => {
  const userId = await widgetUser(request);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });
  const items = await db
    .select({
      id: bookmarks.id,
      url: bookmarks.url,
      title: bookmarks.title,
      reminderAt: bookmarks.reminderAt,
      isPinned: bookmarks.isPinned,
      isRead: bookmarks.isRead,
      widgetEnabled: bookmarks.widgetEnabled,
      openedAt: bookmarks.openedAt,
      updatedAt: bookmarks.updatedAt
    })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.updatedAt));
  return json({ items, syncedAt: new Date().toISOString() });
};

export const PATCH = async ({ request }) => {
  const userId = await widgetUser(request);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (typeof body.id !== 'string')
    return json({ error: 'Bookmark id is required' }, { status: 400 });
  const values: {
    widgetEnabled?: boolean;
    isPinned?: boolean;
    isRead?: boolean;
    openedAt?: Date;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (body.widgetEnabled !== undefined)
    values.widgetEnabled = Boolean(body.widgetEnabled);
  if (body.isPinned !== undefined) values.isPinned = Boolean(body.isPinned);
  if (body.isRead !== undefined) values.isRead = Boolean(body.isRead);
  if (body.openedAt !== undefined) {
    const openedAt = new Date(String(body.openedAt));
    if (Number.isNaN(+openedAt))
      return json({ error: 'Invalid opened date' }, { status: 400 });
    values.openedAt = openedAt;
  }
  const updated = await db
    .update(bookmarks)
    .set(values)
    .where(and(eq(bookmarks.id, body.id), eq(bookmarks.userId, userId)))
    .returning({ id: bookmarks.id });
  if (!updated.length) return json({ error: 'Not found' }, { status: 404 });
  return json({ success: true });
};
