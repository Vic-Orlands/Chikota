import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { bookmarks, tags, bookmarksToTags } from '$lib/db/schema';
import { auth } from '$lib/auth';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { bookmarkInput } from '$lib/server/bookmark-input';

export const GET = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await db.query.bookmarks.findMany({
    where: eq(bookmarks.userId, session.user.id),
    orderBy: desc(bookmarks.createdAt),
    with: { tags: { with: { tag: true } } }
  });
  return json(
    rows.map((b) => ({
      ...b,
      summary: b.description,
      tags: b.tags.map((t) => t.tag)
    }))
  );
};

export const POST = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });
  const { values, tagNames } = bookmarkInput(await request.json());
  const newBookmark = {
    ...values,
    id: nanoid(),
    userId: session.user.id,
    url: values.url!,
    title: values.title!,
    createdAt: new Date()
  };
  const savedTags = await db.transaction(async (tx) => {
    await tx.insert(bookmarks).values(newBookmark);
    const saved = [];
    for (const name of tagNames || []) {
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
        .values({ bookmarkId: newBookmark.id, tagId: tag.id });
      saved.push(tag);
    }
    return saved;
  });
  return json(
    { ...newBookmark, summary: newBookmark.description, tags: savedTags },
    { status: 201 }
  );
};
