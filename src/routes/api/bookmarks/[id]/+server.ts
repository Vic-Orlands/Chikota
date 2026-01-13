import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { bookmarks } from "$lib/db/schema";
import { auth } from "$lib/auth";
import { eq, and } from "drizzle-orm";

export const DELETE = async ({ request, params }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    await db
        .delete(bookmarks)
        .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, session.user.id)));

    return json({ success: true });
};

export const PUT = async ({ request, params }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const updateData: any = {};
    if (body.reminderAt !== undefined) {
        updateData.reminderAt = body.reminderAt ? new Date(body.reminderAt) : null;
    }
    if (body.reminderEmail !== undefined) {
        updateData.reminderEmail = body.reminderEmail || null;
    }

    updateData.updatedAt = new Date();

    await db
        .update(bookmarks)
        .set(updateData)
        .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, session.user.id)));

    return json({ success: true });
};
