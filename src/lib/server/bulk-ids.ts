export const MAX_BULK_IDS = 200;

export type BulkIdsResult =
  | { ok: true; ids: string[] }
  | { ok: false; message: string };

export function parseBulkIds(body: unknown): BulkIdsResult {
  if (body === null || typeof body !== 'object' || Array.isArray(body))
    return { ok: false, message: 'Expected { ids: string[] }' };

  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids))
    return { ok: false, message: 'ids must be an array of bookmark ids' };
  if (ids.length === 0) return { ok: false, message: 'ids must not be empty' };
  if (ids.length > MAX_BULK_IDS)
    return {
      ok: false,
      message: `Delete up to ${MAX_BULK_IDS} bookmarks at once`
    };

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id !== 'string' || !id.trim())
      return { ok: false, message: 'Each id must be a non-empty string' };
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }
  return { ok: true, ids: unique };
}
