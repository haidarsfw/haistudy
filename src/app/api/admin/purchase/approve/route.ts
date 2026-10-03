import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope } from "@/lib/auth/admin-scope";
import { generateUniqueKey } from "@/lib/license/generator";
import { recordActivity } from "@/lib/admin/activity";
import { creditReferralOnApproval } from "@/lib/referral/rewards";
import { recordPartnerCommission } from "@/lib/mentor/commission";
import { sendAccessApprovedEmail } from "@/lib/notifications/account-email";
import { PACKAGE_LABELS, packageMaxDevices, type PurchasablePackageId } from "@/lib/payments";
import { parseScopeKey, scopeFullLabel } from "@/lib/scope";
import type { ScopeTuple } from "@/types/scope";
import { forgetLicenseAccount } from "@/lib/auth/account-link";
import { carryForwardIdentity } from "@/lib/auth/identity-carry";

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

    // A refused order stays refused until someone says otherwise.
    //
    // The panel hides the buttons once a row is rejected, so this is only
    // reachable from a stale tab or a direct call — but it was reachable, and
    // it minted a real licence and burned a real invoice number for an order
    // that had been turned down. Reversing a rejection is a legitimate thing to
    // want; doing it by accident is not, so it goes back through "pending"
    // where the normal checks apply again.
    if (purchase.status === "rejected") {
      return NextResponse.json(
        {
          error:
            "Pembelian ini sudah ditolak. Kembalikan statusnya ke pending dulu kalau memang mau disetujui.",
          code: "ALREADY_REJECTED",
        },
        { status: 409 }
      );
    }

    // Not every order is a new access. A top-up or an upgrade carries the
    // buyer's EXISTING key and is granted by the queue's PATCH; minting a new
    // licence for one would hand out a second access for the price of a few
    // attempts or a tier step.
    if (purchase.package === "exam_quota" || purchase.package === "upgrade") {
      return NextResponse.json(
        {
          error: "Ini bukan pembelian akses baru. Setujui dari antrean (bukan lewat pembuatan lisensi).",
          code: "NOT_AN_ACCESS",
        },
        { status: 409 }
      );
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
      .select("id, email, full_name, nickname, auth_provider, email_verified_at")
      .eq("id", accountId)
      .maybeSingle();
    if (!account) {
      return NextResponse.json(
        { error: "Akun pembelinya sudah tidak ada.", code: "ACCOUNT_GONE" },
        { status: 409 }
      );
    }

    // A confirmed address is a REAL condition of approval, not a hint in the
    // admin's browser. It used to live only in the panel — one dialog, one
    // click past it — so anything that called this route directly sailed
    // through, and the registration mail cheerfully said confirming was
    // optional. The buyer's address is where the licence, the invoice and
    // every later reset link go; approving an unconfirmed one is how access
    // gets sold into a typo.
    //
    // Still overridable, because a hard block would strand a paying customer
    // whose mail simply never arrived — but the override has to be asked for,
    // and it is written into the purchase so it is visible afterwards.
    const overrideUnverified = body.overrideUnverified === true;
    if (!account.email_verified_at && !overrideUnverified) {
      return NextResponse.json(
        {
          error:
            "Pembeli belum mengonfirmasi emailnya. Minta dia klik tautan konfirmasi dulu, atau setujui paksa kalau kamu yakin.",
          code: "EMAIL_UNVERIFIED",
        },
        { status: 409 }
      );
    }

    const key = await generateUniqueKey(supabase);

    const maxDevices =
      // Same package-aware clamp as /api/payments. A flat 3 here would let an
      // older pending order, or one placed before that fix, still be approved
      // as a bigger licence than the package sells.
      typeof meta.deviceLimit === "number"
        ? Math.min(packageMaxDevices(pkg), Math.max(1, meta.deviceLimit))
        : packageMaxDevices(pkg);

    // The buyer perk from the plan: "Pembeli pakai kode → Kuota Latihan Soal +2".
    // Once per person, on the licence bought with the code — their FIRST
    // approved purchase, the same purchase the Rp5.000 referee discount applies
    // to. A renewal is not "buying with a code"; the code was spent. It sits on
    // the licence rather than per subject so it switches on by itself for every
    // subject the period later gains (Latihan Soal for B30 is not written yet).
    let referralExamBonus = 0;
    if (accountId) {
      const [{ data: use }, { count: earlier }] = await Promise.all([
        supabase.from("referral_uses").select("code").eq("account_id", accountId).maybeSingle(),
        supabase
          .from("purchase_requests")
          .select("id", { head: true, count: "exact" })
          .eq("account_id", accountId)
          .eq("status", "approved")
          .neq("id", id),
      ]);
      if (use?.code && !earlier) referralExamBonus = 2;
    }

    const { error: keyErr } = await supabase.from("license_keys").insert({
      key,
      referral_exam_bonus: referralExamBonus,
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

    // This licence has just come into existence already owned. Drop any cached
    // ownership for the key so the buyer's very first writes carry their
    // account, rather than the minutes after approval being the only stretch of
    // their history with no owner recorded.
    forgetLicenseAccount(key);

    // A returning buyer should not arrive at a factory-fresh account. Their
    // settings and profile are copied onto the new licence here, before they
    // ever sign in, so the login path stays out of it entirely. Non-fatal by
    // construction: it logs and returns rather than throwing.
    await carryForwardIdentity(supabase, accountId, key);

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
        meta: {
          ...meta,
          ...(orderNo !== null ? { orderNo } : {}),
          // Recorded so an override is answerable later: which orders were let
          // through without a confirmed address, and when.
          ...(overrideUnverified && !account.email_verified_at
            ? { approvedUnverified: new Date().toISOString() }
            : {}),
        },
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

    // This is the moment a referral becomes real. Not at signup — a programme
    // that pays for registrations pays for throwaway addresses. Idempotent, so
    // approving twice cannot mint a second milestone.
    //
    // A partner is paid in cash INSTEAD of the Rp5.000 balance, not on top of
    // it: the ladder already pays them several times that. The commission row
    // is written here, at approval, because the rate depends on how many people
    // they had brought AT THIS MOMENT and the price of the package THEN.
    // Neither can be recovered afterwards, which is why it is written down once
    // and never recomputed.
    const outcome = await recordPartnerCommission(supabase, {
      purchaseId: id,
      buyerAccountId: accountId,
      // What was actually paid, after any discount. Paying a percentage of the
      // list price on a discounted sale takes the discount out of the margin
      // twice — once for the buyer, once again for the partner.
      baseAmount: typeof meta.basePrice === "number" ? meta.basePrice : 0,
      buyerDeviceId: typeof meta.deviceId === "string" ? meta.deviceId : null,
    });
    // Only a clean "not a partner" falls through to the Rp5.000 balance. On an
    // error the referrer may well BE a partner, so paying the balance would be
    // paying the wrong thing; paying nothing and saying so loudly lets the
    // owner settle it, and the use stays unsettled so it is not lost.
    if (outcome.kind === "error") {
      console.error(
        `[komisi] GAGAL dicatat untuk pesanan ${id} (partner ${outcome.partnerId ?? "?"}): ${outcome.message}`
      );
      // Into the activity log the owner already reads, so a failed commission
      // is visible in the panel and not only in a server log nobody opens.
      // recordActivity never throws.
      await recordActivity(supabase, {
        action: "commission_failed",
        userName: (purchase.name as string) ?? "",
        details: `Komisi partner gagal dicatat untuk pesanan ${id}: ${outcome.message}`,
        scope,
      });
    } else {
      // "recorded" and "skipped" both mean the referrer is a partner, and a
      // partner never takes the balance: a renewal by someone already paid for,
      // or a referral during a pause, earns nothing at all.
      await creditReferralOnApproval(supabase, accountId, {
        skipCredit: outcome.kind === "recorded" || outcome.kind === "skipped",
      });
      if (outcome.kind === "skipped" && outcome.reason === "shared-device") {
        // Logged where the owner looks, because it can also be innocent — a
        // mentor helping a mentee check out on the mentor's phone in class.
        // The owner can still credit it by hand.
        await recordActivity(supabase, {
          action: "commission_blocked",
          userName: (purchase.name as string) ?? "",
          details: `Komisi partner ditolak: pesanan ${id} dibuat dari perangkat partnernya sendiri`,
          scope,
        });
      }
      if (outcome.kind === "recorded") {
        const c = outcome.commission;
        console.log(
          `[komisi] partner ${c.partnerId} penjualan ke-${c.nth}: ` +
            `${c.ratePercent}% dari ${c.baseAmount} = ${c.amount}`
        );
      }
    }

    // A period bought is a rename earned. Tied to approval rather than to
    // submitting an order so an unpaid order cannot buy a new identity, and
    // done through a function so a double approval cannot hand out two.
    if (accountId) {
      const { error: grantErr } = await supabase.rpc("grant_nickname_change", {
        p_account_id: accountId,
        p_purchase_id: id,
      });
      if (grantErr) {
        // Never fatal. The buyer has their access; a missing rename allowance
        // is something the owner can add by hand.
        console.error("[purchase/approve] nickname grant failed", grantErr);
      }
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
