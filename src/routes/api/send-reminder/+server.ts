import { json } from "@sveltejs/kit";
import { Resend } from "resend";
import { auth } from "$lib/auth";

const resend = new Resend(process.env.RESEND_API_KEY);

export const POST = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, title, url, reminderAt } = await request.json();

    if (!email || !title || !url || !reminderAt) {
        return json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        const { data, error } = await resend.emails.send({
            from: "Chikota <reminders@chikota.app>", // Update with your domain
            to: [email],
            subject: `Reminder: ${title}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Bookmark Reminder</h2>
                    <p>Don't forget to check your bookmark!</p>
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
                        <h3 style="margin: 0 0 8px 0;">${title}</h3>
                        <p style="margin: 0; color: #6b7280;">${url}</p>
                    </div>
                    <p>Scheduled for: ${new Date(reminderAt).toLocaleString()}</p>
                    <a href="${url}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Bookmark</a>
                </div>
            `,
        });

        if (error) {
            console.error("Resend error:", error);
            return json({ error: "Failed to send email" }, { status: 500 });
        }

        return json({ success: true, id: data?.id });
    } catch (err) {
        console.error("Email send error:", err);
        return json({ error: "Internal server error" }, { status: 500 });
    }
};