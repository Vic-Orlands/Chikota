import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { tags } from '$lib/db/schema';
import { auth } from '$lib/auth';
import { and, eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userTags = await db.query.tags.findMany({
    where: eq(tags.userId, session.user.id),
    orderBy: desc(tags.createdAt)
  });

  return json(userTags);
};

export const POST = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const existing = await db.query.tags.findFirst({
    where: and(eq(tags.userId, session.user.id), eq(tags.name, body.name))
  });

  if (existing) {
    return json(existing);
  }

  const newTag = {
    id: nanoid(),
    userId: session.user.id,
    name: body.name,
    color: body.color || 'blue',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.insert(tags).values(newTag);
  return json(newTag);
};
