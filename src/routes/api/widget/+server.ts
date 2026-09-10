import { error, json } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '$lib/db';
import { bookmarks, categories } from '$lib/db/schema';
import { bookmarkInput } from '$lib/server/bookmark-input';
import { widgetUser } from '$lib/server/widget-auth';

const bookmarkFields = {
  id: bookmarks.id,
  url: bookmarks.url,
  title: bookmarks.title,
  description: bookmarks.description,
  categoryId: bookmarks.categoryId,
  reminderAt: bookmarks.reminderAt,
  isPinned: bookmarks.isPinned,
  isRead: bookmarks.isRead,
  widgetEnabled: bookmarks.widgetEnabled,
  openedAt: bookmarks.openedAt,
  createdAt: bookmarks.createdAt,
  updatedAt: bookmarks.updatedAt
};

async function ownedCategory(userId: string, categoryId: unknown) {
  if (!categoryId) return null;
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, String(categoryId)),
        eq(categories.userId, userId)
      )
    )
    .limit(1);
  if (!category) error(400, 'Collection not found');
  return category.id;
}

export const GET = async ({ request }) => {
  const userId = await widgetUser(request);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });
  const [items, collections] = await Promise.all([
    db
      .select(bookmarkFields)
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.updatedAt)),
    db
      .select({
        id: categories.id,
        name: categories.name,
        color: categories.color,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt
      })
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(desc(categories.updatedAt))
  ]);
  return json({
    items,
    categories: collections,
    syncedAt: new Date().toISOString()
  });
};

export const POST = async ({ request }) => {
  const userId = await widgetUser(request);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  if (body.type === 'category') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 80)
      return json(
        { error: 'A collection name of up to 80 characters is required' },
        { status: 400 }
      );
    const [created] = await db
      .insert(categories)
      .values({
        id: nanoid(),
        userId,
        name,
        color:
          typeof body.color === 'string' ? body.color.slice(0, 30) : 'amber'
      })
      .returning();
    return json({ category: created }, { status: 201 });
  }

  const { values } = bookmarkInput(body);
  values.categoryId = await ownedCategory(userId, values.categoryId);
  const [created] = await db
    .insert(bookmarks)
    .values({
      ...values,
      id: nanoid(),
      userId,
      url: values.url!,
      title: values.title!,
      createdAt: new Date()
    })
    .returning(bookmarkFields);
  return json({ bookmark: created }, { status: 201 });
};

export const PATCH = async ({ request }) => {
  const userId = await widgetUser(request);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (typeof body.id !== 'string')
    return json({ error: 'Bookmark id is required' }, { status: 400 });
  const { values } = bookmarkInput(body, true);
  if (body.categoryId !== undefined)
    values.categoryId = await ownedCategory(userId, body.categoryId);
  const [updated] = await db
    .update(bookmarks)
    .set(values)
    .where(and(eq(bookmarks.id, body.id), eq(bookmarks.userId, userId)))
    .returning(bookmarkFields);
  if (!updated) return json({ error: 'Not found' }, { status: 404 });
  return json({ bookmark: updated });
};

export const DELETE = async ({ request }) => {
  const userId = await widgetUser(request);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (typeof body.id !== 'string')
    return json({ error: 'An id is required' }, { status: 400 });

  if (body.type === 'category') {
    const removed = await db.transaction(async (tx) => {
      const [owned] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, body.id), eq(categories.userId, userId)))
        .limit(1);
      if (!owned) return false;
      await tx
        .update(bookmarks)
        .set({ categoryId: null, updatedAt: new Date() })
        .where(
          and(eq(bookmarks.categoryId, body.id), eq(bookmarks.userId, userId))
        );
      await tx
        .delete(categories)
        .where(and(eq(categories.id, body.id), eq(categories.userId, userId)));
      return true;
    });
    if (!removed) return json({ error: 'Not found' }, { status: 404 });
    return json({ success: true });
  }

  const removed = await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.id, body.id), eq(bookmarks.userId, userId)))
    .returning({ id: bookmarks.id });
  if (!removed.length) return json({ error: 'Not found' }, { status: 404 });
  return json({ success: true });
};
