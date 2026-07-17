import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { scopeColumns } from "@/lib/auth/scope-check";
import { parseScopeKey, isAvailableScope, scopeKey, scopeFullLabel } from "@/lib/scope";
import { rateLimit } from "@/lib/support/server";
import { PACKAGE_LABELS, computeUniqueAmount, effectiveBasePrice, formatIDR, type PurchasablePackageId } from "@/lib/payments";
import { recordActivity } from "@/lib/admin/activity";
import { notifyAdminsOnPurchase } from "@/lib/notifications/purchase-alert";
import { sendPurchaseInvoiceEmail } from "@/lib/notifications/email";
import { firstWord, capitalizeFirst } from "@/lib/name";
import { hashPassword, validatePassword, PASSWORD_MAX_LENGTH } from "@/lib/auth/password";
import type { PurchaseLoginMethod } from "@/lib/auth/login-method";

// ─── POST /api/payments - on-site purchase submission (public, pre-login) ───
// multipart/form-data.
//
// scope-exempt: this is a PUBLIC pre-login route. The buyer has no session and
// therefore no hs-scope cookie to require — they are buying access to a scope,
// not acting inside one. Scope comes from the submitted value and is validated
// against isAvailableScope() below (mirrors /api/webhooks/purchase). Every row
// written still carries scopeColumns(scope), so nothing lands unscoped.
//
// Activation stays MANUAL: admin verifies in the Purchase Queue, then approves.

const ALLOWED_PACKAGES = new Set<PurchasablePackageId>(["share", "normal", "vip", "diamond"]);
const ALLOWED_METHODS = new Set(["bca", "ewallet", "qris"]);
// License keys are no longer sold — buyers pick an account. 'key' is gone from
// the form and is NOT accepted here; existing key holders are unaffected, their
// licenses already exist.
const ALLOWED_LOGIN_METHODS = new Set<PurchaseLoginMethod>(["google", "password"]);
const GMAIL_RE = /@(gmail|googlemail)\.com$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // server cap (client compresses to <500KB)

function getStr(fd: FormData, key: string, max: number): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function asUpload(v: FormDataEntryValue | null): Blob | null {
  if (
    v &&
    typeof v === "object" &&
    "arrayBuffer" in v &&
    typeof (v as Blob).size === "number" &&
    (v as Blob).size > 0
  ) {
    return v as Blob;
  }
  return null;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  try {
    // Rate limit: 5 submissions / 10 min / IP.
    const ip = clientIp(request);
    if (!rateLimit(`payments:${ip}`, 10 * 60_000, 5)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
    }

    const fd = await request.formData();

    const name = getStr(fd, "name", 100);
    const nickname = getStr(fd, "nickname", 24);
    const whatsapp = getStr(fd, "whatsapp", 30);
    const email = getStr(fd, "email", 120);
    const pkg = getStr(fd, "package", 20) as PurchasablePackageId;
    const scopeRaw = getStr(fd, "scope", 24);
    const classCode = getStr(fd, "classCode", 60);
    const campus = getStr(fd, "campus", 60);
    const deviceLimitRaw = parseInt(getStr(fd, "deviceLimit", 3) || "2", 10);
    const paymentMethod = getStr(fd, "paymentMethod", 20);
    const source = getStr(fd, "source", 80);
    const leShareNote = getStr(fd, "leShareNote", 20);
    const loginMethod = getStr(fd, "loginMethod", 10);
    const loginEmail = getStr(fd, "loginEmail", 120);
    const shareMethod = getStr(fd, "shareMethod", 12);
    // NOT run through getStr: that trims, and a leading/trailing space is a
    // legitimate character in a password. Only the length cap applies.
    const loginPasswordRaw = fd.get("loginPassword");
    const loginPassword =
      typeof loginPasswordRaw === "string"
        ? loginPasswordRaw.slice(0, PASSWORD_MAX_LENGTH + 1)
        : "";

    // ── Validation ──
    if (!name || whatsapp.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "Nama dan WhatsApp wajib diisi." }, { status: 400 });
    }
    // Short name / nickname: required, 1-24 chars (shown everywhere in-app).
    if (!nickname || nickname.length < 1 || nickname.length > 24) {
      return NextResponse.json({ error: "Nama panggilan wajib diisi (maks 24 karakter)." }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    if (!ALLOWED_PACKAGES.has(pkg)) {
      return NextResponse.json({ error: "Paket tidak valid." }, { status: 400 });
    }
    if (!ALLOWED_METHODS.has(paymentMethod)) {
      return NextResponse.json({ error: "Metode pembayaran tidak valid." }, { status: 400 });
    }
    if (!classCode || !campus || !source) {
      return NextResponse.json({ error: "Lengkapi semua field wajib." }, { status: 400 });
    }
    if (!ALLOWED_LOGIN_METHODS.has(loginMethod as PurchaseLoginMethod)) {
      return NextResponse.json({ error: "Cara masuk tidak valid." }, { status: 400 });
    }
    // Google sign-in needs a Google address; that is Google's constraint, not ours.
    if (loginMethod === "google" && !GMAIL_RE.test(loginEmail)) {
      return NextResponse.json(
        { error: "Untuk masuk lewat Google, pakai alamat Gmail." },
        { status: 400 }
      );
    }
    // The password path exists precisely so buyers without a Gmail can still
    // buy, so any domain goes.
    if (loginMethod === "password") {
      if (!EMAIL_RE.test(loginEmail)) {
        return NextResponse.json({ error: "Email untuk masuk tidak valid." }, { status: 400 });
      }
      const pwErr = validatePassword(loginPassword);
      if (pwErr) {
        return NextResponse.json({ error: pwErr }, { status: 400 });
      }
    }

    const deviceLimit = Number.isFinite(deviceLimitRaw) ? Math.min(3, Math.max(1, deviceLimitRaw)) : 2;

    const scope = parseScopeKey(scopeRaw);
    if (!scope || !isAvailableScope(scope)) {
      return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
    }
    const sk = scopeKey(scope);

    // ── Files ──
    const paymentProof = asUpload(fd.get("paymentProof"));
    const shareProof = asUpload(fd.get("shareProof"));
    const shareProof2 = asUpload(fd.get("shareProof2"));
    if (!paymentProof) {
      return NextResponse.json({ error: "Bukti pembayaran wajib diunggah." }, { status: 400 });
    }
    if (pkg === "share" && !shareProof) {
      return NextResponse.json({ error: "Bukti share wajib diunggah." }, { status: 400 });
    }
    // Share method gates the proof count: Story = 1, Broadcast = LE86 → 2, else 1.
    if (pkg === "share") {
      if (shareMethod !== "broadcast" && shareMethod !== "story") {
        return NextResponse.json({ error: "Metode berbagi tidak valid." }, { status: 400 });
      }
      if (shareMethod === "broadcast" && classCode === "LE86" && !shareProof2) {
        return NextResponse.json({ error: "Bukti broadcast kedua wajib untuk kelas LE86." }, { status: 400 });
      }
    }
    for (const f of [paymentProof, shareProof, shareProof2]) {
      if (!f) continue;
      if (f.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "Ukuran file terlalu besar." }, { status: 400 });
      }
      if (!(f.type || "").startsWith("image/")) {
        return NextResponse.json({ error: "File harus berupa gambar." }, { status: 400 });
      }
    }

    const basePrice = effectiveBasePrice(pkg, classCode);
    const uniqueAmount = computeUniqueAmount(basePrice, whatsapp);

    // Dev mode (no Supabase): accept as a no-op success.
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true, id: crypto.randomUUID() });
    }

    const supabase = createServerClient()!;

    // One address = one account — oauth_links enforces it with a unique index.
    // Checking now turns what would be a failure at approval time, long after
    // the buyer has paid, into a clear message while they still have the form
    // open. Runs before the uploads so a rejected submission costs no storage.
    const { data: emailTaken } = await supabase
      .from("oauth_links")
      .select("license_key")
      .eq("email_lower", loginEmail.toLowerCase())
      .maybeSingle();
    if (emailTaken) {
      return NextResponse.json(
        { error: "Email ini sudah dipakai akun lain. Pakai email lain, atau chat admin." },
        { status: 409 }
      );
    }

    // Upload proofs to the PRIVATE payment-proofs bucket (service_role).
    const uploadOne = async (blob: Blob, suffix: string): Promise<string> => {
      const path = `${sk}/${crypto.randomUUID()}-${suffix}.jpg`;
      const buffer = Buffer.from(await blob.arrayBuffer());
      const { error } = await supabase.storage
        .from("payment-proofs")
        .upload(path, buffer, { contentType: blob.type || "image/jpeg", upsert: false });
      if (error) throw error;
      return path;
    };

    const paymentPath = await uploadOne(paymentProof, "pay");
    const sharePath = shareProof ? await uploadOne(shareProof, "share") : null;
    const sharePath2 = shareProof2 ? await uploadOne(shareProof2, "share2") : null;

    // Invoice number is assigned at APPROVE (admin Purchase Queue), not here, so
    // unverified / rejected submissions never burn a number. See the PATCH
    // handler in /api/admin/purchase (calls next_scope_invoice → meta.orderNo).

    const meta = {
      classCode,
      campus,
      deviceLimit,
      paymentMethod,
      uniqueAmount,
      basePrice,
      source,
      ...(leShareNote ? { leShareNote } : {}),
      loginMethod,
      // The address the account will be keyed to, for BOTH methods. The
      // password itself is NOT here and must never be: meta is read wholesale
      // by the admin queue and the CSV export.
      loginEmail: loginEmail.toLowerCase(),
      scopeKey: sk,
      nickname,
      ...(pkg === "share" ? { shareMethod } : {}),
    };

    const { data: inserted, error: insErr } = await supabase
      .from("purchase_requests")
      .insert({
        name,
        whatsapp,
        email: email || null,
        package: pkg,
        status: "pending",
        ...scopeColumns(scope),
        meta,
        payment_proof_path: paymentPath,
        share_proof_path: sharePath,
        share_proof_path_2: sharePath2,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // Park the password hash where the admin surfaces cannot reach it. The
    // queue and the export both `select("*")` on purchase_requests, so a column
    // there would be shipped to the admin's browser and written into the CSV.
    // On approval this moves to oauth_links and the row is deleted.
    if (loginMethod === "password" && inserted?.id) {
      const { error: credErr } = await supabase.from("pending_credentials").insert({
        purchase_request_id: inserted.id as string,
        email_lower: loginEmail.toLowerCase(),
        password_hash: await hashPassword(loginPassword),
      });
      // Without this the buyer has paid for an account that can never be
      // activated, so fail loudly rather than leaving a half-made purchase.
      if (credErr) throw credErr;
    }

    // Audit → admin Activity Logs (low-freq, high-value student event).
    await recordActivity(supabase, {
      action: "purchase_request",
      userName: name,
      details: `${PACKAGE_LABELS[pkg] ?? pkg} • ${scopeFullLabel(scope)}`,
      ip: clientIp(request),
      scope,
    });

    // Background: alert admins (push + email). Never blocks the buyer response.
    waitUntil(
      notifyAdminsOnPurchase({
        requestId: (inserted?.id as string) ?? null,
        name,
        packageLabel: PACKAGE_LABELS[pkg] ?? pkg,
        uniqueAmount,
        scopeLabel: scopeFullLabel(scope),
        whatsapp,
        loginMethod: loginMethod as PurchaseLoginMethod,
      }).catch((e) => console.error("[payments] admin alert failed", e))
    );

    // Background: email the buyer their invoice (received & verifying). /payments only.
    if (email) {
      waitUntil(
        sendPurchaseInvoiceEmail({
          to: email,
          buyerName: capitalizeFirst(nickname || firstWord(name)),
          scopeLabel: scopeFullLabel(scope),
          packageLabel: PACKAGE_LABELS[pkg] ?? pkg,
          amount: formatIDR(uniqueAmount),
          whatsapp,
          loginMethod: loginMethod as PurchaseLoginMethod,
        }).catch((e) => console.error("[payments] buyer invoice email failed", e))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payments POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
