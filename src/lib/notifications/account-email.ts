/**
 * Account e-mails: verify an address, reset a password.
 *
 * Same transport and failure contract as the support/purchase mails in
 * `email.ts` — never throws, returns `{ ok: false }` when Resend is not
 * configured, so a missing key degrades to "no mail" rather than a broken
 * signup.
 *
 * The shell below uses the current brand (emerald `#10b981` on the landing's
 * near-black green) rather than the slate/`#22c55e` of the older templates in
 * `email.ts`. Those predate the rebrand; they get moved onto this shell when
 * the approval e-mail lands, so every haistudy mail ends up looking like one
 * family.
 */

import { Resend } from "resend";

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "noreply@haistudy.site";
const REPLY_TO = process.env.EMAIL_REPLY_TO;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://haistudy.site").replace(
  /\/$/,
  ""
);

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!RESEND_KEY) return null;
  if (!client) client = new Resend(RESEND_KEY);
  return client;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

function safe(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface ShellArgs {
  heading: string;
  greetingName?: string;
  body: string[];
  ctaLabel: string;
  ctaUrl: string;
  /** Small print under the button. Usually "if this wasn't you…". */
  footnote: string;
}

/**
 * One layout for every account mail. Table-based and fully inline-styled
 * because that is what mail clients actually render; the raw link is always
 * repeated as text since a good share of clients suppress the button.
 */
function renderShell(a: ShellArgs): string {
  const paragraphs = a.body
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#c5d3cc">${p}</p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="id"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0b120f;color:#e8efeb;margin:0;padding:24px">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;margin:0 auto;background:#131d19;border-radius:16px;overflow:hidden">
    <tr><td style="padding:22px 26px 0">
      <div style="font-size:19px;font-weight:800;letter-spacing:-0.3px">
        <span style="color:#10b981">hai</span><span style="color:#fff">study</span>
      </div>
    </td></tr>
    <tr><td style="padding:18px 26px 26px">
      ${
        a.greetingName
          ? `<p style="margin:0 0 4px;font-size:13px;color:#94a29b">Halo ${safe(a.greetingName)},</p>`
          : ""
      }
      <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#fff;font-weight:800">${safe(a.heading)}</h1>
      ${paragraphs}
      <a href="${a.ctaUrl}" style="display:inline-block;background:#10b981;color:#04130d;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;font-size:14px">
        ${safe(a.ctaLabel)}
      </a>
      <p style="margin:18px 0 0;font-size:11px;line-height:1.6;color:#7d8b84">
        Kalau tombolnya tidak jalan, salin tautan ini ke peramban:<br>
        <span style="color:#94a29b;word-break:break-all">${a.ctaUrl}</span>
      </p>
      <p style="margin:14px 0 0;font-size:11px;line-height:1.6;color:#7d8b84">${a.footnote}</p>
    </td></tr>
  </table>
</body></html>`;
}

async function send(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<SendResult> {
  const r = getClient();
  if (!r) return { ok: false, error: "missing-resend-key" };
  try {
    const res = await r.emails.send({
      from: `haistudy <${FROM}>`,
      to,
      replyTo: REPLY_TO || undefined,
      subject,
      html,
      text,
    });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true, id: res.data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

// Both links are public pages on purpose. People open mail on a phone and
// browse on a laptop, so a link that first demands a sign-in is a link that
// quietly never gets clicked.
export function verifyUrl(token: string): string {
  return `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
}

export function resetUrl(token: string): string {
  return `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendVerifyEmail(opts: {
  to: string;
  name?: string;
  token: string;
}): Promise<SendResult> {
  const url = verifyUrl(opts.token);
  const html = renderShell({
    heading: "Konfirmasi email kamu",
    greetingName: opts.name || undefined,
    body: [
      "Akun haistudy kamu sudah jadi. Tinggal satu langkah: konfirmasi kalau email ini benar milikmu.",
      "Kamu <strong style=\"color:#e8efeb\">tetap bisa langsung pakai akunmu</strong> tanpa ini. Konfirmasi cuma memastikan kamu bisa mengatur ulang password nanti kalau lupa.",
    ],
    ctaLabel: "Konfirmasi email",
    ctaUrl: url,
    footnote:
      "Tautan ini berlaku 7 hari. Kalau kamu tidak pernah membuat akun di haistudy, abaikan saja email ini.",
  });
  const text = [
    `Halo${opts.name ? ` ${opts.name}` : ""},`,
    "",
    "Akun haistudy kamu sudah jadi. Konfirmasi email kamu lewat tautan ini:",
    url,
    "",
    "Kamu tetap bisa langsung pakai akunmu tanpa ini. Tautan berlaku 7 hari.",
    "Kalau kamu tidak pernah membuat akun di haistudy, abaikan email ini.",
  ].join("\n");

  return send(opts.to, "Konfirmasi email haistudy kamu", html, text);
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name?: string;
  token: string;
}): Promise<SendResult> {
  const url = resetUrl(opts.token);
  const html = renderShell({
    heading: "Atur ulang password",
    greetingName: opts.name || undefined,
    body: [
      "Ada permintaan untuk mengatur ulang password akun haistudy kamu. Klik tombol di bawah untuk membuat password baru.",
    ],
    ctaLabel: "Buat password baru",
    ctaUrl: url,
    footnote:
      "Tautan ini berlaku 1 jam dan cuma bisa dipakai sekali. Kalau bukan kamu yang meminta, abaikan email ini, passwordmu tidak berubah.",
  });
  const text = [
    `Halo${opts.name ? ` ${opts.name}` : ""},`,
    "",
    "Ada permintaan untuk mengatur ulang password akun haistudy kamu:",
    url,
    "",
    "Tautan berlaku 1 jam dan cuma bisa dipakai sekali.",
    "Kalau bukan kamu yang meminta, abaikan email ini. Passwordmu tidak berubah.",
  ].join("\n");

  return send(opts.to, "Atur ulang password haistudy", html, text);
}
