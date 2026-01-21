import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { tags } from "$lib/db/schema";
import { auth } from "$lib/auth";
import { eq, and } from "drizzle-orm";

export const PUT = async ({ request, params }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    await db.update(tags)
        .set({
            name: body.name,
            color: body.color,
            updatedAt: new Date()
        })
        .where(and(
            eq(tags.id, id),
            eq(tags.userId, session.user.id)
        ));

    return json({ success: true });
};

export const DELETE = async ({ request, params }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    await db.delete(tags)
        .where(and(
            eq(tags.id, id),
            eq(tags.userId, session.user.id)
        ));

    return json({ success: true });
};
