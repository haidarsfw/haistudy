// ============================================
// WhatsApp activation message builder
// ============================================

import { capitalizeFirst } from "@/lib/name";
import { resolveLoginMethod, type StoredLoginMethod } from "@/lib/auth/login-method";

// Shared by BOTH issue flows so the message stays identical:
//   - admin Purchase Queue approval (purchase-queue.tsx)
//   - admin Quick License generator (quick-license.tsx)
//
// Shortened, copy-friendly format. The bare https://haistudy.site URL makes
// WhatsApp render the homepage link-preview card (the embed the owner wants),
// so keep it as the only/first URL in the message.

export interface ApprovalWaArgs {
  /** Short name / nickname (falls back to firstWord(name) at the call site). */
  nickname: string;
  /** Per-scope invoice number, assigned at approve. */
  invoiceNo: number;
  /** How this buyer signs in. 'email' is the legacy alias of 'google'. */
  loginMethod: StoredLoginMethod;
  /** License key. Only used for 'key' login, which is no longer sold. */
  licenseKey: string;
  /** The address the account is keyed to ('google' and 'password'). */
  gmail?: string;
  /** Package label, e.g. "Diamond". */
  pkgLabel: string;
  /** Pre-formatted amount, e.g. "Rp 50.000". */
  amount: string;
  /** Scope label, e.g. "Semester 2 · UAS · Business Management". */
  periode: string;
}

export function buildApprovalWa(o: ApprovalWaArgs): string {
  const inv = `#${String(o.invoiceNo).padStart(3, "0")}`;
  const nick = capitalizeFirst(o.nickname);
  const method = resolveLoginMethod(o.loginMethod);
  const head = `🧾 INVOICE ${inv} · haistudy\nHalo ${nick}, pesananmu sudah aktif ✅\n\n`;
  // Tell them how THEY sign in — the way they chose at checkout. Sending a
  // license key to someone who registered a password is how the old
  // "anything that isn't 'email' must be 'key'" shape used to fail.
  const access =
    method === "password"
      ? `🌐 Buka https://haistudy.site → Login → masukkan ${o.gmail} + password yang kamu buat waktu beli\n`
      : method === "google"
        ? `🌐 Buka https://haistudy.site → "Login dengan Google" → pilih ${o.gmail}\n`
        : `🔑 License key: ${o.licenseKey}\n🌐 Buka https://haistudy.site → Login → tempel key\n`;
  const meta = `\n📦 ${o.pkgLabel} · ${o.amount} · ${o.periode}\n`;
  const tail =
    method === "key"
      ? " Jangan bagikan key-mu 🙏"
      : method === "password"
        ? " Jangan bagikan akunmu 🙏"
        : "";
  const act = `\nAktivasi: login di device utama, lalu kirim screenshot Dashboard ke chat ini untuk validasi device.${tail}`;
  return head + access + meta + act;
}
