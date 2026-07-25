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
import { AccountError } from "@/lib/auth/account";
import { requireAccount } from "@/lib/auth/account-session";

// ─── POST /api/payments - on-site purchase submission (signed in) ───
// multipart/form-data.
//
// The buyer must have an account. Access lands on that account, so identity is
// read from the session rather than from the payload — a forged body cannot
// attach a purchase to an address the sender does not own. Credentials are no
// longer created here at all: the account already exists by the time anyone
// reaches this route.
//
// scope-exempt: they are buying access TO a scope, not acting inside one, so
// there is no hs-scope cookie to require. Scope comes from the submitted value
// and is validated against isAvailableScope() below (mirrors
// /api/webhooks/purchase). Every row written still carries scopeColumns(scope),
// so nothing lands unscoped.
//
// Activation stays MANUAL: admin verifies in the Purchase Queue, then approves.

const ALLOWED_PACKAGES = new Set<PurchasablePackageId>(["share", "normal", "vip", "diamond"]);
const ALLOWED_METHODS = new Set(["bca", "ewallet", "qris"]);
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

    // Who is buying. From the session, never from the payload.
    const account = await requireAccount();
    const email = account.email;

    const fd = await request.formData();

    const name = getStr(fd, "name", 100);
    const nickname = getStr(fd, "nickname", 24);
    const whatsapp = getStr(fd, "whatsapp", 30);
    const pkg = getStr(fd, "package", 20) as PurchasablePackageId;
    const scopeRaw = getStr(fd, "scope", 24);
    const classCode = getStr(fd, "classCode", 60);
    const campus = getStr(fd, "campus", 60);
    const angkatan = getStr(fd, "angkatan", 16);
    const deviceLimitRaw = parseInt(getStr(fd, "deviceLimit", 3) || "2", 10);
    const paymentMethod = getStr(fd, "paymentMethod", 20);
    const source = getStr(fd, "source", 80);
    const leShareNote = getStr(fd, "leShareNote", 20);
    const shareMethod = getStr(fd, "shareMethod", 12);

    // ── Validation ──
    if (!name || whatsapp.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "Nama dan WhatsApp wajib diisi." }, { status: 400 });
    }
    // Short name / nickname: required, 1-24 chars (shown everywhere in-app).
    if (!nickname || nickname.length < 1 || nickname.length > 24) {
      return NextResponse.json({ error: "Nama panggilan wajib diisi (maks 24 karakter)." }, { status: 400 });
    }
    if (!ALLOWED_PACKAGES.has(pkg)) {
      return NextResponse.json({ error: "Paket tidak valid." }, { status: 400 });
    }
    if (!ALLOWED_METHODS.has(paymentMethod)) {
      return NextResponse.json({ error: "Metode pembayaran tidak valid." }, { status: 400 });
    }
    if (!classCode || !campus || !source || !angkatan) {
      return NextResponse.json({ error: "Lengkapi semua field wajib." }, { status: 400 });
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

    // Whatever the buyer just filled in that their account did not already
    // hold gets written back, so the next purchase asks for none of it. Fields
    // the account already had arrive unchanged, making this a no-op for a
    // returning buyer. Class is included deliberately: it changes every
    // semester and is only kept to prefill the next checkout.
    await supabase
      .from("accounts")
      .update({
        full_name: name,
        nickname,
        whatsapp,
        campus,
        angkatan: angkatan.toUpperCase(),
        class_code: classCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

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
      angkatan: angkatan.toUpperCase(),
      deviceLimit,
      paymentMethod,
      uniqueAmount,
      basePrice,
      source,
      ...(leShareNote ? { leShareNote } : {}),
      // How the buyer signs in, carried for the admin's approval message. It
      // describes an account that already exists rather than one to be made.
      loginMethod: account.authProvider,
      loginEmail: account.emailLower,
      scopeKey: sk,
      nickname,
      ...(pkg === "share" ? { shareMethod } : {}),
    };

    const { data: inserted, error: insErr } = await supabase
      .from("purchase_requests")
      .insert({
        name,
        whatsapp,
        email,
        // The link that makes approval trivial: the admin no longer has to
        // match an address by hand, and no credentials have to be parked
        // anywhere waiting to be moved.
        account_id: account.id,
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
        loginMethod: account.authProvider,
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
          loginMethod: account.authProvider,
        }).catch((e) => console.error("[payments] buyer invoice email failed", e))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Signed out mid-checkout: say so plainly so the form can send them to
    // sign in again rather than showing a generic server error.
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Payments POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
