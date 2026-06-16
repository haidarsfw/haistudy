// ============================================
// WhatsApp activation message builder
// ============================================
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
  /** 'email' = Google sign-in, 'key' = paste license key. */
  loginMethod: "key" | "email";
  /** License key (only used for 'key' login). */
  licenseKey: string;
  /** Gmail to sign in with (only used for 'email' login). */
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
  const head = `🧾 INVOICE ${inv} · haistudy\nHalo ${o.nickname}, pesananmu sudah aktif ✅\n\n`;
  const access =
    o.loginMethod === "email"
      ? `🌐 Buka https://haistudy.site → "Login dengan Google" → pilih ${o.gmail}\n`
      : `🔑 License key: ${o.licenseKey}\n🌐 Buka https://haistudy.site → Login → tempel key\n`;
  const meta = `\n📦 ${o.pkgLabel} · ${o.amount} · ${o.periode}\n`;
  const act = `\nAktivasi: login di device utama, lalu kirim screenshot Dashboard ke chat ini untuk validasi device.${
    o.loginMethod === "email" ? "" : " Jangan bagikan key-mu 🙏"
  }`;
  return head + access + meta + act;
}
