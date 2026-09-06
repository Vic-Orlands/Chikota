import { error } from '@sveltejs/kit';

export function bookmarkInput(body: Record<string, unknown>, partial = false) {
  const values: {
    url?: string;
    title?: string;
    description?: string;
    categoryId?: string | null;
    reminderAt?: Date | null;
    reminderEmail?: string | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (!partial || body.url !== undefined) {
    try {
      const url = new URL(String(body.url));
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
      values.url = url.href;
    } catch {
      error(400, 'A valid http or https URL is required');
    }
  }
  if (!partial || body.title !== undefined) {
    if (
      typeof body.title !== 'string' ||
      !body.title.trim() ||
      body.title.length > 300
    )
      error(400, 'A title of up to 300 characters is required');
    values.title = body.title.trim();
  }
  if (body.summary !== undefined || body.description !== undefined)
    values.description = String(body.summary ?? body.description).slice(
      0,
      2000
    );
  if (body.categoryId !== undefined)
    values.categoryId = String(body.categoryId || '') || null;
  if (body.reminderAt !== undefined) {
    values.reminderAt = body.reminderAt
      ? new Date(String(body.reminderAt))
      : null;
    if (values.reminderAt && Number.isNaN(+values.reminderAt))
      error(400, 'Invalid reminder date');
  }
  if (body.reminderEmail !== undefined)
    values.reminderEmail = String(body.reminderEmail || '') || null;
  let tagNames: string[] | undefined;
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.length > 30)
      error(400, 'Use up to 30 tags');
    tagNames = [
      ...new Set(
        body.tags
          .map((t) =>
            typeof t?.name === 'string' ? t.name.trim().slice(0, 60) : ''
          )
          .filter(Boolean)
      )
    ] as string[];
  }
  return { values, tagNames };
}
