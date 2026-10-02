import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { attachReferral, normalizeReferralCode } from "@/lib/referral/codes";
import { resolvePartnerHandle } from "@/lib/referral/partner-link";
import { creditReferralOnApproval } from "@/lib/referral/rewards";
import { recordPartnerCommission } from "@/lib/mentor/commission";
import { recordActivity } from "@/lib/admin/activity";

/**
 * Attribution net #4 from the plan: "Ditambahkan manual dari panel admin —
 * kalau semua kosong dan mentor mengajukan bukti."
 *
 * A mentee who forgot the code at sign-up is attached to their mentor by hand.
 * Attaching alone would be nearly useless: by the time a mentor notices, the
 * mentee has usually already bought, and commission is decided at approval. So
 * with `creditLatest` it also runs the normal approval-time reward for the
 * buyer's most recent approved purchase — the same function, the same rules
 * (once per person, never on the partner's own device, a paused partner earns
 * nothing), not a second path that could disagree with the first.
 *
 * Refused when the buyer already has a referrer. Attribution is permanent by
 * design (`referral_uses` is unique per account); a panel that could overwrite
 * it would let one mentor's credit be moved to another after the fact.
 *
 * scope-exempt: admin route, and referrals are not tied to an exam period.
 */
export async function POST(req: Request) {
  const { authorized, licenseKey } = await validateAdmin();
  if (!authorized) return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    buyerEmail?: string;
    code?: string;
    creditLatest?: boolean;
  };
  const email = String(body.buyerEmail ?? "").trim().toLowerCase();
  const code = normalizeReferralCode(String(body.code ?? ""));
  if (!email || !code) {
    return NextResponse.json({ error: "Email pembeli dan kode wajib diisi" }, { status: 400 });
  }

  const supabase = createServerClient()!;
  const { data: buyer } = await supabase
    .from("accounts")
    .select("id, email, nickname")
    .eq("email_lower", email)
    .maybeSingle();
  if (!buyer) return NextResponse.json({ error: "Belum ada akun dengan email itu" }, { status: 404 });

  const { data: existing } = await supabase
    .from("referral_uses")
    .select("code")
    .eq("account_id", buyer.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `Akun ini sudah terikat ke kode ${existing.code as string}, dan itu permanen.` },
      { status: 409 }
    );
  }

  // Code or nickname, resolved exactly as `/@nama` resolves it: in the panel
  // the owner is likelier to remember the mentor's name than their code.
  const found = await resolvePartnerHandle(supabase, code);
  if (!found) return NextResponse.json({ error: "Kode atau nama tidak dikenal" }, { status: 404 });
  if (found.accountId === buyer.id) {
    return NextResponse.json({ error: "Tidak bisa memakai kode sendiri" }, { status: 400 });
  }

  const ok = await attachReferral(supabase, buyer.id as string, found.code);
  if (!ok) return NextResponse.json({ error: "Gagal memasang kode" }, { status: 500 });

  let reward: string = "tidak diminta";
  if (body.creditLatest) {
    const { data: latest } = await supabase
      .from("purchase_requests")
      .select("id, meta")
      .eq("account_id", buyer.id)
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) {
      reward = "belum ada pembelian yang disetujui; dihitung otomatis saat nanti disetujui";
    } else {
      const meta = (latest.meta ?? {}) as Record<string, unknown>;
      const outcome = await recordPartnerCommission(supabase, {
        purchaseId: latest.id as string,
        buyerAccountId: buyer.id as string,
        baseAmount: typeof meta.basePrice === "number" ? meta.basePrice : 0,
        buyerDeviceId: typeof meta.deviceId === "string" ? meta.deviceId : null,
      });
      if (outcome.kind === "error") {
        reward = `komisi GAGAL dicatat: ${outcome.message}`;
      } else {
        await creditReferralOnApproval(supabase, buyer.id as string, {
          skipCredit: outcome.kind === "recorded" || outcome.kind === "skipped",
        });
        reward =
          outcome.kind === "recorded"
            ? `komisi tercatat: orang ke-${outcome.commission.nth}, Rp${outcome.commission.amount}`
            : outcome.kind === "skipped"
              ? `tidak dibayar (${outcome.reason})`
              : "bukan partner: saldo Rp5.000 ke pengajak, kalau belum pernah";
      }
    }
  }

  await recordActivity(supabase, {
    action: "referral_attached_manually",
    userName: (buyer.nickname as string) || (buyer.email as string),
    details: `Kode ${found.code} dipasang manual oleh ${licenseKey}; ${reward}`,
  });

  return NextResponse.json({ ok: true, code: found.code, reward });
}
