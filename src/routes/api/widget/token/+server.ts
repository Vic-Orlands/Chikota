import { randomBytes } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '$lib/auth';
import { db } from '$lib/db';
import { widgetAccessTokens } from '$lib/db/schema';
import { hashWidgetToken } from '$lib/server/widget-auth';

export const POST = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });
  const token = `chk_widget_${randomBytes(24).toString('base64url')}`;
  await db.insert(widgetAccessTokens).values({
    id: nanoid(),
    userId: session.user.id,
    tokenHash: hashWidgetToken(token)
  });
  return json({ token });
};

export const DELETE = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });
  await db
    .delete(widgetAccessTokens)
    .where(eq(widgetAccessTokens.userId, session.user.id));
  return json({ success: true });
};
