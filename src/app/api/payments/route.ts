import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { scopeColumns } from "@/lib/auth/scope-check";
import { parseScopeKey, isAvailableScope, scopeKey, scopeFullLabel } from "@/lib/scope";
import { rateLimit } from "@/lib/support/server";
import { PACKAGE_PRICES, PACKAGE_LABELS, computeUniqueAmount, type PurchasablePackageId } from "@/lib/payments";
import { notifyAdminsOnPurchase } from "@/lib/notifications/purchase-alert";

// ─── POST /api/payments - on-site purchase submission (public, pre-login) ───
// multipart/form-data. No requireScope: the buyer has no session cookie yet, so
// scope is validated from the submitted value (mirrors /api/webhooks/purchase).
// Key delivery stays MANUAL: admin verifies in the Purchase Queue, then issues.

const ALLOWED_PACKAGES = new Set<PurchasablePackageId>(["share", "normal", "vip", "diamond"]);
const ALLOWED_METHODS = new Set(["bca", "ewallet", "qris"]);
const ALLOWED_LOGIN_METHODS = new Set(["key", "email"]);
const GMAIL_RE = /@(gmail|googlemail)\.com$/i;
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
    const loginMethod = getStr(fd, "loginMethod", 10) || "key";
    const loginEmail = getStr(fd, "loginEmail", 120);

    // ── Validation ──
    if (!name || whatsapp.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "Nama dan WhatsApp wajib diisi." }, { status: 400 });
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
    if (!ALLOWED_LOGIN_METHODS.has(loginMethod)) {
      return NextResponse.json({ error: "Metode login tidak valid." }, { status: 400 });
    }
    // Email-login buyers must supply a Gmail / Googlemail address (used for Google sign-in).
    if (loginMethod === "email" && !GMAIL_RE.test(loginEmail)) {
      return NextResponse.json(
        { error: "Untuk login via Email, gunakan alamat Gmail." },
        { status: 400 }
      );
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
    if (!paymentProof) {
      return NextResponse.json({ error: "Bukti pembayaran wajib diunggah." }, { status: 400 });
    }
    if (pkg === "share" && !shareProof) {
      return NextResponse.json({ error: "Bukti share wajib diunggah." }, { status: 400 });
    }
    for (const f of [paymentProof, shareProof]) {
      if (!f) continue;
      if (f.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "Ukuran file terlalu besar." }, { status: 400 });
      }
      if (!(f.type || "").startsWith("image/")) {
        return NextResponse.json({ error: "File harus berupa gambar." }, { status: 400 });
      }
    }

    const basePrice = PACKAGE_PRICES[pkg];
    const uniqueAmount = computeUniqueAmount(basePrice, whatsapp);

    // Dev mode (no Supabase): accept as a no-op success.
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true, id: crypto.randomUUID() });
    }

    const supabase = createServerClient()!;

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
      ...(loginMethod === "email" ? { loginEmail: loginEmail.toLowerCase() } : {}),
      scopeKey: sk,
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
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // Background: alert admins (push + email). Never blocks the buyer response.
    waitUntil(
      notifyAdminsOnPurchase({
        requestId: (inserted?.id as string) ?? null,
        name,
        packageLabel: PACKAGE_LABELS[pkg] ?? pkg,
        uniqueAmount,
        scopeLabel: scopeFullLabel(scope),
        whatsapp,
        loginMethod: loginMethod === "email" ? "email" : "key",
      }).catch((e) => console.error("[payments] admin alert failed", e))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payments POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
