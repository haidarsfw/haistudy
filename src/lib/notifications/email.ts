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
import { WA_ADMIN } from "@/lib/payments";
import {
  resolveLoginMethod,
  type StoredLoginMethod,
} from "@/lib/auth/login-method";

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

// ─── Admin purchase alert ───

export interface PurchaseAlertEmailOpts {
  to: string[]; // admin recipients (deduped, lowercased)
  buyerName: string;
  packageLabel: string;
  amount: string; // pre-formatted, e.g. "Rp 35.171"
  scopeLabel: string;
  whatsapp?: string | null;
  loginMethod?: StoredLoginMethod;
}

/**
 * Notify admins that a new purchase landed in the queue. Sent to the union of
 * ADMIN_ALERT_EMAIL (env) and every admin's user_profiles.email. No-op when
 * Resend is unconfigured or there are no recipients.
 */
export async function sendPurchaseAlertEmail(opts: PurchaseAlertEmailOpts): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const r = getClient();
  if (!r) return { ok: false, error: "missing-resend-key" };
  if (!opts.to.length) return { ok: false, error: "no-recipients" };

  const url = `${APP_URL.replace(/\/$/, "")}/admin?tab=5`;
  const subject = `Pembelian baru: ${opts.buyerName} · ${opts.packageLabel}`;
  const html = renderPurchaseAlertHtml({ ...opts, url });
  const text = renderPurchaseAlertText({ ...opts, url });

  try {
    const res = await r.emails.send({
      from: `haistudy <${FROM}>`,
      to: opts.to,
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

interface PurchaseAlertRenderArgs extends PurchaseAlertEmailOpts {
  url: string;
}

// Phrased for an email body. Resolution lives in lib/auth/login-method so this
// can't drift from what the login gates actually allow.
function loginMethodLabel(m: StoredLoginMethod): string {
  switch (resolveLoginMethod(m)) {
    case "google":
      return "Login lewat Google";
    case "password":
      return "Login pakai email & password";
    case "key":
      return "Login pakai license key";
    default:
      return "—";
  }
}

function renderPurchaseAlertHtml(a: PurchaseAlertRenderArgs): string {
  const safe = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 0;font-size:13px;color:#94a3b8">${safe(label)}</td>` +
    `<td style="padding:4px 0;font-size:13px;color:#e2e8f0;text-align:right;font-weight:600">${safe(value)}</td></tr>`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>haistudy</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:14px;overflow:hidden">
    <tr><td style="padding:24px 24px 8px">
      <div style="font-weight:900;font-size:20px;letter-spacing:-0.5px">
        <span style="color:#22c55e">hai</span><span style="color:#fff">study</span>
      </div>
    </td></tr>
    <tr><td style="padding:8px 24px 16px">
      <p style="margin:0 0 14px;font-size:15px;line-height:1.5">
        <strong>Pembelian baru</strong> masuk ke antrian admin.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0f172a;border-radius:8px;padding:8px 14px;margin-bottom:18px">
        ${row("Nama", a.buyerName)}
        ${row("Paket", a.packageLabel)}
        ${row("Nominal", a.amount)}
        ${row("Periode", a.scopeLabel)}
        ${a.whatsapp ? row("WhatsApp", a.whatsapp) : ""}
        ${row("Metode login", loginMethodLabel(a.loginMethod))}
      </table>
      <a href="${a.url}" style="display:inline-block;background:#22c55e;color:#0f172a;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:8px;font-size:14px">
        Buka Purchase Queue
      </a>
      <p style="margin:18px 0 0;font-size:11px;color:#64748b;line-height:1.5">
        Verifikasi pembayaran lalu approve untuk mengirim license key.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function renderPurchaseAlertText(a: PurchaseAlertRenderArgs): string {
  return (
    `Pembelian baru masuk ke antrian haistudy.\n\n` +
    `Nama: ${a.buyerName}\n` +
    `Paket: ${a.packageLabel}\n` +
    `Nominal: ${a.amount}\n` +
    `Periode: ${a.scopeLabel}\n` +
    (a.whatsapp ? `WhatsApp: ${a.whatsapp}\n` : "") +
    `Metode login: ${loginMethodLabel(a.loginMethod)}\n\n` +
    `Buka Purchase Queue: ${a.url}\n`
  );
}

// ─── Buyer purchase invoice (sent to the buyer right after submission) ───

export interface PurchaseInvoiceEmailOpts {
  to: string;
  buyerName: string;
  orderNo?: number;
  scopeLabel: string;
  packageLabel: string;
  amount: string; // pre-formatted, e.g. "Rp 20.000"
  whatsapp: string;
  loginMethod: StoredLoginMethod;
}

/**
 * Email the buyer a "we received your order, verifying within 1×24 jam"
 * invoice. No-op when Resend is unconfigured or `to` is empty. Never throws
 * to the caller's await (errors are returned, not raised).
 */
export async function sendPurchaseInvoiceEmail(opts: PurchaseInvoiceEmailOpts): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const r = getClient();
  if (!r) return { ok: false, error: "missing-resend-key" };
  if (!opts.to) return { ok: false, error: "no-recipient" };

  const invoiceNo = opts.orderNo ? `#${String(opts.orderNo).padStart(3, "0")}` : "";
  const subject = invoiceNo
    ? `Invoice ${invoiceNo} · Pesanan haistudy diterima`
    : `Pesanan haistudy diterima`;
  const html = renderPurchaseInvoiceHtml({ ...opts, invoiceNo });
  const text = renderPurchaseInvoiceText({ ...opts, invoiceNo });

  try {
    const res = await r.emails.send({
      from: `haistudy <${FROM}>`,
      to: opts.to,
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

interface InvoiceRenderArgs extends PurchaseInvoiceEmailOpts {
  invoiceNo: string;
}

function renderPurchaseInvoiceHtml(a: InvoiceRenderArgs): string {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 0;font-size:13px;color:#94a3b8">${safe(label)}</td>` +
    `<td style="padding:4px 0;font-size:13px;color:#e2e8f0;text-align:right;font-weight:600">${safe(value)}</td></tr>`;
  // Emphasized row — the nominal the buyer must transfer stands out (accent + larger).
  const nominalRow = (label: string, value: string) =>
    `<tr><td style="padding:9px 0;font-size:13px;color:#94a3b8;vertical-align:middle">${safe(label)}</td>` +
    `<td style="padding:9px 0;text-align:right"><span style="font-size:19px;font-weight:800;color:#22c55e">${safe(value)}</span></td></tr>`;
  const loginLabel = loginMethodLabel(a.loginMethod);
  const website = APP_URL.replace(/\/$/, "");
  const waUrl = `https://wa.me/${WA_ADMIN}`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>haistudy</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:14px;overflow:hidden">
    <tr><td style="padding:24px 24px 8px">
      <div style="font-weight:900;font-size:20px;letter-spacing:-0.5px">
        <span style="color:#22c55e">hai</span><span style="color:#fff">study</span>
      </div>
    </td></tr>
    <tr><td style="padding:8px 24px 16px">
      <p style="margin:0 0 4px;font-size:13px;color:#94a3b8">Halo ${safe(a.buyerName)},</p>
      <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#fff">Pesananmu sudah kami terima ✅</p>
      ${
        a.invoiceNo
          ? `<p style="margin:0 0 14px;font-size:13px;color:#22c55e;font-weight:700">Invoice ${safe(a.invoiceNo)} · ${safe(a.scopeLabel)}</p>`
          : `<p style="margin:0 0 14px;font-size:13px;color:#94a3b8">${safe(a.scopeLabel)}</p>`
      }
      <p style="margin:14px 0 18px;font-size:14px;line-height:1.6;color:#cbd5e1">
        Pembayaran &amp; buktimu sedang <strong style="color:#e2e8f0">kami verifikasi</strong>. Santai aja — kamu
        <strong style="color:#e2e8f0">tidak perlu melakukan apa pun</strong> sekarang. 🙌
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0f172a;border-radius:10px;padding:6px 16px;margin-bottom:14px">
        ${row("Paket", a.packageLabel)}
        ${nominalRow("Nominal", a.amount)}
        ${row("Periode", a.scopeLabel)}
        ${row("Metode login", loginLabel)}
        ${row("Status", "Menunggu verifikasi")}
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px">
        <tr><td style="border-left:3px solid #22c55e;padding:3px 0 3px 12px;font-size:13px;line-height:1.6;color:#cbd5e1">
          <strong style="color:#e2e8f0">Maks 1&times;24 jam</strong> — license key / akses login dikirim ke WhatsApp-mu <strong style="color:#e2e8f0">${safe(a.whatsapp)}</strong>.
        </td></tr>
      </table>
      <a href="${website}" style="display:inline-block;background:#22c55e;color:#0f172a;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:9px;font-size:14px;letter-spacing:0.2px">
        Buka haistudy
      </a>
      <p style="margin:14px 0 0;font-size:12px;color:#94a3b8">
        Ada kendala atau ingin menyusulkan info? <a href="${waUrl}" style="color:#94a3b8;text-decoration:underline">Hubungi admin via WhatsApp</a>.
      </p>
      <p style="margin:18px 0 0;font-size:11px;color:#64748b;line-height:1.5">
        Email otomatis dari haistudy${a.invoiceNo ? ` · Invoice ${safe(a.invoiceNo)}` : ""}. Simpan sebagai referensi pesananmu.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function renderPurchaseInvoiceText(a: InvoiceRenderArgs): string {
  const website = APP_URL.replace(/\/$/, "");
  const loginLabel = loginMethodLabel(a.loginMethod);
  return (
    `Halo ${a.buyerName},\n\n` +
    `Pesananmu sudah kami terima${a.invoiceNo ? ` (Invoice ${a.invoiceNo})` : ""}.\n` +
    `Pembayaran & buktimu sedang kami verifikasi. Santai aja — kamu tidak perlu melakukan apa pun sekarang.\n\n` +
    `Paket: ${a.packageLabel}\n` +
    `Nominal: ${a.amount}\n` +
    `Periode: ${a.scopeLabel}\n` +
    `Metode login: ${loginLabel}\n` +
    `Status: Menunggu verifikasi\n\n` +
    `Maks 1x24 jam — license key / akses login dikirim ke WhatsApp-mu (${a.whatsapp}).\n\n` +
    `Buka haistudy: ${website}\n` +
    `Hubungi admin: https://wa.me/${WA_ADMIN}\n\n` +
    `- haistudy\n`
  );
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
          <span style="color:#22c55e">hai</span><span style="color:#fff">study</span>
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
