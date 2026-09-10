import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { widgetAccessTokens } from '$lib/db/schema';

export function hashWidgetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function widgetUser(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const tokenHash = hashWidgetToken(authorization.slice(7).trim());
  const access = await db.query.widgetAccessTokens.findFirst({
    where: eq(widgetAccessTokens.tokenHash, tokenHash)
  });
  if (!access) return null;
  await db
    .update(widgetAccessTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(widgetAccessTokens.id, access.id));
  return access.userId;
}
