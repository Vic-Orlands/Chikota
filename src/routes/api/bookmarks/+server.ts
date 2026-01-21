import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { bookmarks, tags, bookmarksToTags } from "$lib/db/schema";
import { auth } from "$lib/auth";
import { eq, desc, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

export const GET = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const userBookmarks = await db.query.bookmarks.findMany({
        where: eq(bookmarks.userId, session.user.id),
        orderBy: desc(bookmarks.createdAt),
        with: {
            tags: {
                with: {
                    tag: true
                }
            }
        }
    });

    const transformedBookmarks = userBookmarks.map(b => ({
        ...b,
        tags: b.tags.map(t => t.tag)
    }));

    return json(transformedBookmarks);
};

export const POST = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tags: inputTags, ...rest } = body;

    const newBookmark = {
        id: nanoid(),
        userId: session.user.id,
        url: rest.url,
        title: rest.title,
        description: rest.description || "",
        imageUrl: rest.imageUrl || null,
        categoryId: rest.categoryId || null,
        reminderAt: rest.reminderAt ? new Date(rest.reminderAt) : null,
        reminderEmail: rest.reminderEmail || null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await db.transaction(async (tx) => {
        await tx.insert(bookmarks).values(newBookmark);

        if (inputTags && inputTags.length > 0) {
            for (const tagInput of inputTags) {
                // Check if tag exists for user by name
                const existingtag = await tx.query.tags.findFirst({
                    where: and(
                        eq(tags.userId, session.user.id),
                        eq(tags.name, tagInput.name)
                    )
                });

                let tagId = existingtag?.id;

                if (!tagId) {
                    tagId = nanoid();
                    await tx.insert(tags).values({
                        id: tagId,
                        userId: session.user.id,
                        name: tagInput.name,
                        color: tagInput.color || 'blue' // Default color
                    });
                }

                await tx.insert(bookmarksToTags).values({
                    bookmarkId: newBookmark.id,
                    tagId: tagId
                });
            }
        }
    });

    return json(newBookmark);
};
