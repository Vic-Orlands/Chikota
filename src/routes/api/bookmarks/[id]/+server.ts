import { error, json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { bookmarks, tags, bookmarksToTags } from '$lib/db/schema';
import { auth } from '$lib/auth';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { bookmarkInput } from '$lib/server/bookmark-input';

export const DELETE = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });
  const removed = await db
    .delete(bookmarks)
    .where(
      and(eq(bookmarks.id, params.id), eq(bookmarks.userId, session.user.id))
    )
    .returning({ id: bookmarks.id });
  if (!removed.length) error(404, 'bookmark not found');
  return json({ success: true });
};

export const PUT = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });
  const { values, tagNames } = bookmarkInput(await request.json(), true);
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(bookmarks)
      .set(values)
      .where(
        and(eq(bookmarks.id, params.id), eq(bookmarks.userId, session.user.id))
      )
      .returning({ id: bookmarks.id });
    if (!updated.length) error(404, 'bookmark not found');
    if (tagNames !== undefined) {
      await tx
        .delete(bookmarksToTags)
        .where(eq(bookmarksToTags.bookmarkId, params.id));
      for (const name of tagNames) {
        let tag = await tx.query.tags.findFirst({
          where: and(eq(tags.userId, session.user.id), eq(tags.name, name))
        });
        if (!tag)
          [tag] = await tx
            .insert(tags)
            .values({
              id: nanoid(),
              userId: session.user.id,
              name,
              color: 'blue'
            })
            .returning();
        await tx
          .insert(bookmarksToTags)
          .values({ bookmarkId: params.id, tagId: tag.id });
      }
    }
  });
  return json({ success: true });
};
