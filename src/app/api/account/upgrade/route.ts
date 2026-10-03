import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { scopeColumns } from "@/lib/auth/scope-check";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";
import { listAccountAccesses } from "@/lib/auth/account-access";
import { readDeviceIdentityFromHeader } from "@/lib/auth/device-id";
import { rateLimit } from "@/lib/support/server";
import { PACKAGE_LABELS, computeUniqueAmount, type PurchasablePackageId } from "@/lib/payments";
import { scopeFullLabel } from "@/lib/scope";
import { upgradePrice } from "@/lib/upgrade";
import { recordActivity } from "@/lib/admin/activity";
import { notifyAdminsOnPurchase } from "@/lib/notifications/purchase-alert";
import { displayName } from "@/lib/name";

const ALLOWED_METHODS = new Set(["bca", "ewallet", "qris"]);
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const TIERS = new Set<PurchasablePackageId>(["share", "normal", "vip", "diamond"]);

function getStr(fd: FormData, key: string, max: number): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * POST /api/account/upgrade — order a package upgrade for an access you own.
 * multipart/form-data: { licenseKey, toTier, paymentMethod, paymentProof }
 *
 * The same access, a higher tier: on approval the licence's tier changes, no new
 * key is made and the expiry stays. Priced here from the one rule in
 * lib/upgrade.ts (the list-price difference), never from the browser, plus the
 * same unique-amount suffix checkout uses so the transfer can be matched.
 *
 * scope-exempt: an account-level purchase of a licence the caller owns; scope
 * comes from that licence row and is written onto the order with scopeColumns.
 * Ownership is the guard: the licence must be in listAccountAccesses(account).
 */
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`upgrade:${ip}`, 10 * 60_000, 5)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
    }
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }
    const supabase = createServerClient()!;

    const fd = await request.formData();
    const licenseKey = getStr(fd, "licenseKey", 16).toUpperCase();
    const toTier = getStr(fd, "toTier", 10) as PurchasablePackageId;
    const paymentMethod = getStr(fd, "paymentMethod", 20);
    const proof = fd.get("paymentProof");

    const access = (await listAccountAccesses(supabase, account.id)).find(
      (a) => a.licenseKey === licenseKey
    );
    // Not yours and not found read the same: a key someone else owns is none
    // of this caller's business.
    if (!access) {
      return NextResponse.json({ error: "Akses tidak ditemukan di akunmu." }, { status: 404 });
    }
    if (access.status !== "active") {
      return NextResponse.json(
        { error: "Akses ini sudah tidak aktif, jadi tidak bisa dinaikkan. Beli periode baru saja." },
        { status: 409 }
      );
    }
    if (access.isAdmin) {
      return NextResponse.json({ error: "Akses admin tidak perlu dinaikkan." }, { status: 409 });
    }
    const price = TIERS.has(toTier) ? upgradePrice(access.packageTier, toTier) : null;
    if (price === null) {
      return NextResponse.json({ error: "Pilihan paket tidak tersedia untuk akses ini." }, { status: 400 });
    }
    if (!ALLOWED_METHODS.has(paymentMethod)) {
      return NextResponse.json({ error: "Metode pembayaran tidak valid." }, { status: 400 });
    }
    if (
      !proof ||
      typeof proof !== "object" ||
      !("arrayBuffer" in proof) ||
      (proof as Blob).size === 0
    ) {
      return NextResponse.json({ error: "Bukti pembayaran wajib diunggah." }, { status: 400 });
    }
    const blob = proof as Blob;
    if (blob.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Ukuran file terlalu besar." }, { status: 400 });
    }
    if (!(blob.type || "").startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar." }, { status: 400 });
    }

    // One open upgrade per access. A second would be a second payment for the
    // same change, and the admin would have to work out which to refund.
    const { count: open } = await supabase
      .from("purchase_requests")
      .select("id", { head: true, count: "exact" })
      .eq("license_key", licenseKey)
      .eq("package", "upgrade")
      .eq("status", "pending");
    if (open) {
      return NextResponse.json(
        { error: "Pesanan naik paket untuk akses ini masih diperiksa. Tunggu dulu, ya." },
        { status: 409 }
      );
    }

    const path = `${access.scopeKey}/upgrade-${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("payment-proofs")
      .upload(path, Buffer.from(await blob.arrayBuffer()), {
        contentType: blob.type || "image/jpeg",
        upsert: false,
      });
    if (upErr) throw upErr;

    const uniqueAmount = computeUniqueAmount(price, account.whatsapp);
    const buyerDevice = readDeviceIdentityFromHeader(request.headers.get("cookie")).id || null;
    // The name the admin matches the transfer against: the account's, else the
    // one on the licence (many accounts carry no name; the buyer's lives there).
    const { data: lic } = await supabase.from("license_keys").select("name").eq("key", licenseKey).maybeSingle();
    const name =
      account.fullName ||
      ((lic?.name as string | null) ?? "") ||
      displayName({ shortName: account.nickname, name: account.fullName });
    const label = `Naik paket ${PACKAGE_LABELS[access.packageTier]} → ${PACKAGE_LABELS[toTier]}`;

    const { data: inserted, error: insErr } = await supabase
      .from("purchase_requests")
      .insert({
        name,
        whatsapp: account.whatsapp || "-",
        email: account.email,
        account_id: account.id,
        package: "upgrade",
        status: "pending",
        // The grant target: this access, not a new one.
        license_key: licenseKey,
        ...scopeColumns(access.scope),
        meta: {
          kind: "upgrade",
          fromTier: access.packageTier,
          toTier,
          basePrice: price,
          uniqueAmount,
          paymentMethod,
          scopeKey: access.scopeKey,
          loginMethod: account.authProvider,
          loginEmail: account.emailLower,
          ...(buyerDevice ? { deviceId: buyerDevice } : {}),
        },
        payment_proof_path: path,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    await recordActivity(supabase, {
      action: "purchase_request",
      userName: name,
      details: `${label} • ${scopeFullLabel(access.scope)}`,
      scope: access.scope,
    });
    waitUntil(
      notifyAdminsOnPurchase({
        requestId: (inserted?.id as string) ?? null,
        name,
        packageLabel: label,
        uniqueAmount,
        scopeLabel: scopeFullLabel(access.scope),
        whatsapp: account.whatsapp || "-",
        loginMethod: account.authProvider,
      }).catch((e) => console.error("[upgrade] admin alert failed", e))
    );

    return NextResponse.json({ ok: true, uniqueAmount });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/upgrade] gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
