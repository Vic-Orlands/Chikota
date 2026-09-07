import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { auth } from '$lib/auth';

const resend = new Resend(process.env.RESEND_API_KEY);

function bookmarkReminderEmailHTML(
  user: { email: string; name?: string },
  bookmark: {
    title: string;
    url: string;
    savedDate?: string;
  }
) {
  const name = user.name || 'there';
  const savedDate = bookmark.savedDate || 'recently';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bookmark Reminder - Chikọta</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'segoe ui', Roboto, 'helvetica neue', Arial, sans-serif;
          text-transform: lowercase;
          line-height: 1.6;
          color: #1a1a1a;
          background-color: #f5f5f5;
          padding: 40px 20px;
        }
        .container {
          max-width: 560px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #d3d3d3;
          border-radius: 5px;
          overflow: hidden;
        }
        .header {
          text-align: center;
          padding: 48px 40px 32px;
          background: #ffffff;
        }
        .icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          font-size: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .title {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 0;
        }
        .content {
          padding: 0 40px 40px;
          background: #ffffff;
        }
        .greeting {
          font-size: 16px;
          color: #1a1a1a;
          margin-bottom: 24px;
        }
        .message {
          font-size: 15px;
          color: #4a4a4a;
          margin-bottom: 24px;
          line-height: 1.5;
        }
        .bookmark-card {
          background: #f8f9fa;
          border-left: 4px solid #1a1a1a;
          border-radius: 8px;
          padding: 24px;
          margin: 32px 0;
        }
        .bookmark-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 12px;
        }
        .bookmark-meta {
          font-size: 13px;
          color: #6b6b6b;
          margin-bottom: 16px;
        }
        .bookmark-url {
          font-size: 14px;
          color: #4a4a4a;
          word-break: break-all;
          font-family: 'courier new', monospace;
        }
        .button-container {
          text-align: center;
          margin: 32px 0;
        }
        .button {
          display: inline-block;
          background: #1a1a1a;
          color: #ffffff !important;
          text-decoration: none;
          padding: 16px 48px;
          border-radius: 4px;
          font-weight: 500;
          font-size: 15px;
          transition: background 0.2s ease;
        }
        .button:hover {
          background: #2a2a2a;
        }
        .note {
          font-size: 14px;
          color: #6b6b6b;
          margin-top: 24px;
          line-height: 1.6;
        }
        .footer {
          padding: 24px 40px;
          text-align: center;
          font-size: 14px;
          color: #6b6b6b;
          background: #ffffff;
        }
        .signature {
          margin-top: 32px;
          font-size: 15px;
          color: #1a1a1a;
        }
        @media only screen and (max-width: 600px) {
          .content {
            padding: 0 24px 24px;
          }
          .header {
            padding: 32px 24px 24px;
          }
          .button {
            padding: 14px 32px;
            font-size: 14px;
          }
          .bookmark-card {
            padding: 16px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">🔖</div>
          <h1 class="title">Time to Revisit</h1>
        </div>

        <div class="content">
          <p class="greeting">Hi ${name},</p>

          <p class="message">
            Remember this bookmark you saved? It's time to give it another look!
          </p>

          <div class="bookmark-card">
            <h2 class="bookmark-title">${bookmark.title}</h2>
            <p class="bookmark-meta">Saved ${savedDate}</p>
            <p class="bookmark-url">${bookmark.url}</p>
          </div>

          <div class="button-container">
            <a href="${bookmark.url}" class="button">Open Bookmark</a>
          </div>

          <p class="note">
            Keep your knowledge fresh and your reading list organized with Chikọta.
            Your bookmarks are waiting for you whenever you're ready.
          </p>

          <div class="signature">
            <p>Happy reading,</p>
            <p><strong>The Chikọta Team</strong></p>
          </div>
        </div>

        <div class="footer">
          <p>© 2025 Chikọta. All rights reserved.</p>
          <p style="margin-top: 8px; font-size: 13px;">
            <a href="#" style="color: #6b6b6b; text-decoration: none;">Manage Reminder Settings</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export const POST = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return json({ error: 'sign in to use email reminders' }, { status: 401 });

  const { email, title, url, reminderAt } = await request.json();

  if (!email || !title || !url || !reminderAt) {
    return json({ error: 'missing required fields' }, { status: 400 });
  }

  const scheduledAt = new Date(reminderAt);
  const delay = +scheduledAt - Date.now();
  if (Number.isNaN(+scheduledAt) || delay <= 0) {
    return json({ error: 'choose a future reminder time' }, { status: 400 });
  }
  if (delay > 30 * 24 * 60 * 60 * 1000) {
    return json(
      { error: 'email reminders can be scheduled up to 30 days ahead' },
      { status: 400 }
    );
  }

  try {
    const html = bookmarkReminderEmailHTML(
      { email, name: session.user.name },
      {
        title,
        url,
        savedDate: new Date().toLocaleDateString()
      }
    );

    const { data, error } = await resend.emails.send({
      from: 'Chikọta <contact@mezie.dev>',
      to: [email],
      subject: `time to revisit: ${title}`,
      html,
      scheduledAt: scheduledAt.toISOString()
    });

    if (error) {
      console.error('resend error:', error);
      return json({ error: 'failed to send email' }, { status: 500 });
    }

    return json({
      success: true,
      id: data?.id,
      scheduledAt: scheduledAt.toISOString()
    });
  } catch (err) {
    console.error('email send error:', err);
    return json({ error: 'internal server error' }, { status: 500 });
  }
};

export const DELETE = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await request.json();
  if (!id || typeof id !== 'string') {
    return json({ error: 'missing scheduled email id' }, { status: 400 });
  }
  const { error } = await resend.emails.cancel(id);
  if (error)
    return json(
      { error: 'could not cancel the email reminder' },
      { status: 500 }
    );
  return json({ success: true });
};
