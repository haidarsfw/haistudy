/**
 * Email backup for support notifications via Resend.
 * Sends a digest email when:
 *  - notification is unread, type=support_message
 *  - recipient hasn't been online in last 5 minutes
 *  - notification is older than 2 minutes
 *  - no email sent for (recipient, conversation) in last 30 minutes
 *  - recipient is not muted
 *  - user_settings.notif_email_enabled !== false
 *  - user_profiles.email is present
 */

import { Resend } from "resend";

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "noreply@haistudy.site";
const REPLY_TO = process.env.EMAIL_REPLY_TO;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://haistudy.site";

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!RESEND_KEY) return null;
  if (!client) client = new Resend(RESEND_KEY);
  return client;
}

export interface SendBackupEmailOpts {
  to: string;
  recipientName: string;
  senderName: string;
  preview: string;
  conversationLk: string;
  isAdminRecipient: boolean;
}

export async function sendBackupEmail(opts: SendBackupEmailOpts): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const r = getClient();
  if (!r) return { ok: false, error: "missing-resend-key" };

  const deepPath = opts.isAdminRecipient
    ? `/admin?tab=7&lk=${encodeURIComponent(opts.conversationLk)}`
    : "/support";
  const url = `${APP_URL.replace(/\/$/, "")}${deepPath}`;

  const subject = opts.isAdminRecipient
    ? `Pesan support baru dari ${opts.senderName}`
    : `Balasan support dari ${opts.senderName}`;

  const html = renderEmailHtml({
    recipientName: opts.recipientName,
    senderName: opts.senderName,
    preview: opts.preview,
    url,
  });
  const text = renderEmailText({
    recipientName: opts.recipientName,
    senderName: opts.senderName,
    preview: opts.preview,
    url,
  });

  try {
    const res = await r.emails.send({
      from: `haistudy <${FROM}>`,
      to: opts.to,
      replyTo: REPLY_TO || undefined,
      subject,
      html,
      text,
    });
    if (res.error) {
      return { ok: false, error: res.error.message };
    }
    return { ok: true, id: res.data?.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

interface RenderArgs {
  recipientName: string;
  senderName: string;
  preview: string;
  url: string;
}

function renderEmailHtml(a: RenderArgs): string {
  const safe = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>haistudy</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:14px;overflow:hidden">
    <tr>
      <td style="padding:24px 24px 8px">
        <div style="font-weight:900;font-size:20px;letter-spacing:-0.5px">
          <span style="color:#22c55e">h</span><span style="color:#fff">aistudy</span>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 24px 16px">
        <p style="margin:0 0 6px;font-size:13px;color:#94a3b8">
          Halo ${safe(a.recipientName)},
        </p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.5">
          <strong>${safe(a.senderName)}</strong> mengirim pesan support:
        </p>
        <div style="background:#0f172a;border-left:3px solid #22c55e;padding:12px 14px;border-radius:6px;margin-bottom:18px">
          <p style="margin:0;font-size:14px;line-height:1.5;color:#cbd5e1;white-space:pre-wrap">${safe(a.preview)}</p>
        </div>
        <a href="${a.url}" style="display:inline-block;background:#22c55e;color:#0f172a;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:8px;font-size:14px">
          Buka percakapan
        </a>
        <p style="margin:18px 0 0;font-size:11px;color:#64748b;line-height:1.5">
          Kamu menerima email ini karena pesan support kamu belum dibaca dan kamu sedang offline.
          Atur preferensi di <a href="${a.url.replace(/\/[^/]*$/, "/dashboard")}" style="color:#22c55e">pengaturan haistudy</a>.
        </p>
      </td>
    </tr>
  </table>
</body></html>`;
}

function renderEmailText(a: RenderArgs): string {
  return `Halo ${a.recipientName},\n\n${a.senderName} mengirim pesan support:\n\n${a.preview}\n\nBuka: ${a.url}\n\n- haistudy\n`;
}
