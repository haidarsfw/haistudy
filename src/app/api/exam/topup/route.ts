import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { waitUntil } from "@vercel/functions";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError, scopeColumns } from "@/lib/auth/scope-check";
import { scopeKey, scopeFullLabel } from "@/lib/scope";
import { quotaPackFor } from "@/lib/exam/quota";
import { notifyAdminsOnPurchase } from "@/lib/notifications/purchase-alert";

// ─── POST /api/exam/topup — in-app exam-quota top-up (authenticated) ───
// multipart/form-data: { subjectId, subjectName, qty, paymentMethod, paymentProof }
// The buyer is already logged in (no re-registration). Creates a pending
// purchase_requests row (package='exam_quota'); admin approval grants the bonus.

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ALLOWED_METHODS = new Set(["bca", "ewallet", "qris"]);

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

export async function POST(request: Request) {
  try {
    const scope = await requireScope(request.clone());
    const sk = scopeKey(scope);

    const cookieStore = await cookies();
    const licenseKey = cookieStore.get("hs-session")?.value?.trim().toUpperCase() ?? "";
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fd = await request.formData();
    const subjectId = getStr(fd, "subjectId", 60);
    const subjectName = getStr(fd, "subjectName", 120) || subjectId;
    const qty = parseInt(getStr(fd, "qty", 3), 10);
    const paymentMethod = getStr(fd, "paymentMethod", 20);
    const pack = quotaPackFor(qty);

    if (!subjectId) {
      return NextResponse.json({ error: "subjectId wajib." }, { status: 400 });
    }
    if (!pack) {
      return NextResponse.json({ error: "Paket top-up tidak valid." }, { status: 400 });
    }
    if (!ALLOWED_METHODS.has(paymentMethod)) {
      return NextResponse.json({ error: "Metode pembayaran tidak valid." }, { status: 400 });
    }
    const proof = asUpload(fd.get("paymentProof"));
    if (!proof) {
      return NextResponse.json({ error: "Bukti pembayaran wajib diunggah." }, { status: 400 });
    }
    if (proof.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Ukuran file terlalu besar." }, { status: 400 });
    }
    if (!(proof.type || "").startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar." }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;

    const { data: lic } = await supabase
      .from("license_keys")
      .select("name, short_name")
      .eq("key", licenseKey)
      .maybeSingle();
    const buyerName =
      (lic?.short_name as string) || (lic?.name as string) || "Pengguna";

    // Upload proof to the PRIVATE payment-proofs bucket (service_role).
    const path = `${sk}/topup-${crypto.randomUUID()}.jpg`;
    const buffer = Buffer.from(await proof.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from("payment-proofs")
      .upload(path, buffer, { contentType: proof.type || "image/jpeg", upsert: false });
    if (upErr) throw upErr;

    const meta = {
      kind: "exam_quota" as const,
      quotaQty: pack.qty,
      subjectId,
      subjectName,
      scopeKey: sk,
      basePrice: pack.price,
      paymentMethod,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("purchase_requests")
      .insert({
        name: buyerName,
        whatsapp: "-", // not collected for top-ups (buyer already logged in)
        email: null,
        package: "exam_quota",
        status: "pending",
        license_key: licenseKey, // the buyer's existing key (grant target)
        ...scopeColumns(scope),
        meta,
        payment_proof_path: path,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // Background: alert admins (push + email). Never blocks the buyer response.
    waitUntil(
      notifyAdminsOnPurchase({
        requestId: (inserted?.id as string) ?? null,
        name: buyerName,
        packageLabel: `Top-up Kuota ${pack.qty}× — ${subjectName}`,
        uniqueAmount: pack.price,
        scopeLabel: scopeFullLabel(scope),
        whatsapp: "-",
        loginMethod: "key",
      }).catch((e) => console.error("[topup] admin alert failed", e))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Exam topup error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
