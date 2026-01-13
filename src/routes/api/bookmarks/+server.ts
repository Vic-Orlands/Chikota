import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { bookmarks } from "$lib/db/schema";
import { auth } from "$lib/auth"; // We need to check session
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const GET = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const userBookmarks = await db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.userId, session.user.id))
        .orderBy(desc(bookmarks.createdAt));

    return json(userBookmarks);
};

export const POST = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newBookmark = {
        id: nanoid(),
        userId: session.user.id,
        url: body.url,
        title: body.title,
        description: body.description || "",
        categoryId: body.categoryId || null,
        reminderAt: body.reminderAt ? new Date(body.reminderAt) : null,
        reminderEmail: body.reminderEmail || null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await db.insert(bookmarks).values(newBookmark);
    return json(newBookmark);
};
