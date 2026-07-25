import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope } from "@/lib/auth/admin-scope";
import { generateUniqueKey } from "@/lib/license/generator";
import { recordActivity } from "@/lib/admin/activity";
import { sendAccessApprovedEmail } from "@/lib/notifications/account-email";
import { PACKAGE_LABELS, packageMaxDevices, type PurchasablePackageId } from "@/lib/payments";
import { parseScopeKey, scopeFullLabel } from "@/lib/scope";
import type { ScopeTuple } from "@/types/scope";

const TIER: Record<string, PurchasablePackageId> = {
  share: "share",
  normal: "normal",
  vip: "vip",
  diamond: "diamond",
};

/**
 * Approve a purchase. One call, on the server.
 *
 * This used to be two independent fetches fired from the admin's browser —
 * create the licence, then mark the purchase approved. If the second one
 * failed, a live licence existed while the purchase still read "pending", and
 * approving again minted a SECOND key for the same buyer. Doing it in one
 * request means a failure after the licence is created can still be reported
 * against a known key rather than silently diverging.
 *
 * The key is generated here too. It was `Math.random()` in the browser with a
 * `B29-` prefix; it now uses the same collision-checked generator the rest of
 * the system uses.
 *
 * Nothing has to be matched by hand any more: the purchase carries account_id,
 * so the licence attaches to the buyer's existing account directly.
 */
export async function POST(request: Request) {
  // scope-exempt: admin route. Scope comes from the purchase row being
  // approved and from resolveAdminScope, both validated below.
  try {
    const admin = await validateAdmin();
    if (!admin.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "Purchase id wajib" }, { status: 400 });
    }

    const supabase = createServerClient()!;
    await resolveAdminScope(request);

    const { data: purchase, error: loadErr } = await supabase
      .from("purchase_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (loadErr || !purchase) {
      return NextResponse.json({ error: "Pembelian tidak ditemukan" }, { status: 404 });
    }
    if (purchase.status === "approved" && purchase.license_key) {
      // Idempotent: a double-click must not mint a second key.
      return NextResponse.json({
        ok: true,
        alreadyApproved: true,
        licenseKey: purchase.license_key as string,
      });
    }

    const scope: ScopeTuple | null = parseScopeKey(
      `s${purchase.semester}-${purchase.exam_period}-${purchase.jurusan}`
    );
    if (!scope) {
      return NextResponse.json({ error: "Scope pembelian tidak valid" }, { status: 400 });
    }

    const meta = (purchase.meta ?? {}) as Record<string, unknown>;
    const pkg = TIER[String(purchase.package)] ?? "normal";
    const accountId = (purchase.account_id as string | null) ?? null;

    // Buyers now arrive with an account. A purchase without one predates the
    // account layer (or came in through the legacy Forms webhook) and needs a
    // human, not a guess.
    if (!accountId) {
      return NextResponse.json(
        {
          error:
            "Pembelian ini belum terhubung ke akun. Hubungkan akunnya dulu dari tabel lisensi.",
          code: "NO_ACCOUNT",
        },
        { status: 409 }
      );
    }

    const { data: account } = await supabase
      .from("accounts")
      .select("id, email, full_name, nickname, auth_provider")
      .eq("id", accountId)
      .maybeSingle();
    if (!account) {
      return NextResponse.json(
        { error: "Akun pembelinya sudah tidak ada.", code: "ACCOUNT_GONE" },
        { status: 409 }
      );
    }

    const key = await generateUniqueKey(supabase);

    const maxDevices =
      typeof meta.deviceLimit === "number"
        ? Math.min(3, Math.max(1, meta.deviceLimit))
        : packageMaxDevices(pkg);

    const { error: keyErr } = await supabase.from("license_keys").insert({
      key,
      name: (purchase.name as string) ?? "",
      short_name: (account.nickname as string) || null,
      account_id: accountId,
      package_tier: pkg,
      max_devices: maxDevices,
      // Kept in step with the account so the legacy gates keep behaving.
      login_method: account.auth_provider as string,
      semester: scope.semester,
      exam_period: scope.examPeriod,
      jurusan: scope.jurusan,
    });

    if (keyErr) {
      console.error("[admin/purchase/approve] license insert failed", keyErr);
      return NextResponse.json({ error: "Gagal membuat akses" }, { status: 500 });
    }

    // Invoice number. Idempotent by construction — only assigned when absent,
    // so re-approving keeps the same number.
    let orderNo = typeof meta.orderNo === "number" ? meta.orderNo : null;
    if (orderNo === null) {
      const { data: next } = await supabase.rpc("next_scope_invoice", {
        p_sem: scope.semester,
        p_exam: scope.examPeriod,
        p_jur: scope.jurusan,
      });
      if (typeof next === "number") orderNo = next;
    }

    const { error: patchErr } = await supabase
      .from("purchase_requests")
      .update({
        status: "approved",
        license_key: key,
        approved_at: new Date().toISOString(),
        meta: { ...meta, ...(orderNo !== null ? { orderNo } : {}) },
      })
      .eq("id", id);

    if (patchErr) {
      // The licence exists. Say which one, so it can be finished by hand
      // rather than approved again into a duplicate.
      console.error("[admin/purchase/approve] status update failed", patchErr);
      return NextResponse.json(
        {
          error: `Akses ${key} sudah dibuat, tapi status pembelian gagal diperbarui. Perbarui manual.`,
          licenseKey: key,
        },
        { status: 500 }
      );
    }

    await recordActivity(supabase, {
      action: "purchase_approved",
      userName: (purchase.name as string) ?? "",
      details: `${PACKAGE_LABELS[pkg] ?? pkg} • ${scopeFullLabel(scope)}`,
      scope,
    });

    // The buyer used to hear nothing until the admin remembered to send a
    // WhatsApp by hand. Now the mail goes out on approval; WhatsApp stays as
    // the personal touch on top.
    waitUntil(
      sendAccessApprovedEmail({
        to: account.email as string,
        name: (account.nickname as string) || (account.full_name as string) || "",
        packageLabel: PACKAGE_LABELS[pkg] ?? pkg,
        scopeLabel: scopeFullLabel(scope),
        invoiceNo: orderNo,
        signInWithGoogle: account.auth_provider === "google",
      }).catch((e) => console.error("[admin/purchase/approve] approval mail failed", e))
    );

    return NextResponse.json({ ok: true, licenseKey: key, orderNo });
  } catch (error) {
    console.error("[admin/purchase/approve] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
