import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { normalizeReferralCode, REFERRAL_CODE_MAX } from "@/lib/referral/codes";

/**
 * Campaign referral codes.
 *
 * Personal codes are minted automatically and are not editable here — one per
 * account, forever. This route is only for the codes the owner hands out
 * himself: a class code, a promo, a partner. Those need a cap and an expiry,
 * because a code with neither is a discount that never ends.
 *
 * Unlike the public checker, the admin side DOES say why a code is unusable.
 * The reason a stranger gets one flat "no" is to stop the code space being
 * mapped; there is nothing to protect from someone already holding the admin
 * cookie.
 */

interface CodeRow {
  code: string;
  kind: string;
  label: string;
  active: boolean;
  uses: number;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
}

export async function GET() {
  // scope-exempt: referral codes are deliberately global. A code handed to a
  // friend has to survive that friend buying a different exam period, so
  // scoping it would defeat the point.
  try {
    const admin = await validateAdmin();
    if (!admin.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    const supabase = createServerClient()!;

    const { data: campaigns } = await supabase
      .from("referral_codes")
      .select("code, kind, label, active, uses, max_uses, expires_at, created_at")
      .eq("kind", "campaign")
      .order("created_at", { ascending: false })
      .limit(200);

    // Redemptions counted from the uses table, which is the only number that
    // cannot drift — `uses` on the code row is an advisory counter.
    const { data: uses } = await supabase
      .from("referral_uses")
      .select("code")
      .limit(2000);

    const tally = new Map<string, number>();
    for (const u of uses ?? []) {
      const c = u.code as string;
      tally.set(c, (tally.get(c) ?? 0) + 1);
    }

    // Who has actually recruited anyone. Only codes with at least one
    // redemption — a list of 31 zeroes is not information.
    const earners = [...tally.entries()]
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25);

    let leaderboard: Array<{ code: string; kind: string; who: string; used: number }> = [];
    if (earners.length) {
      const { data: owners } = await supabase
        .from("referral_codes")
        .select("code, kind, label, account_id, accounts(nickname, full_name, email)")
        .in(
          "code",
          earners.map(([c]) => c)
        );

      leaderboard = earners.map(([code, used]) => {
        const row = owners?.find((o) => o.code === code) as
          | {
              kind: string;
              label: string;
              accounts?: { nickname?: string; full_name?: string; email?: string } | null;
            }
          | undefined;
        const acc = row?.accounts;
        return {
          code,
          kind: row?.kind ?? "legacy",
          who:
            acc?.nickname ||
            acc?.full_name ||
            acc?.email ||
            row?.label ||
            "(tidak terhubung ke akun)",
          used,
        };
      });
    }

    // Who each code actually brought in. Sent with the list rather than
    // fetched per row on click: it is a few dozen rows at most, and one query
    // beats an endpoint that gets hammered every time a row is opened.
    const { data: inviteRows } = await supabase
      .from("referral_uses")
      .select("code, created_at, credited_at, accounts(nickname, full_name, email)")
      .order("created_at", { ascending: false })
      .limit(500);

    const invitees: Record<
      string,
      Array<{ who: string; joinedAt: string; credited: boolean }>
    > = {};
    for (const r of inviteRows ?? []) {
      const code = r.code as string;
      const acc = (r as { accounts?: { nickname?: string; full_name?: string; email?: string } | null })
        .accounts;
      (invitees[code] ??= []).push({
        who: acc?.nickname || acc?.full_name || acc?.email || "(akun terhapus)",
        joinedAt: r.created_at as string,
        credited: Boolean(r.credited_at),
      });
    }

    // Balance owed across everyone. Nothing to transfer — it is spent
    // automatically on their next purchase — but worth seeing as a liability.
    const { data: creditRows } = await supabase
      .from("referral_credits")
      .select("amount, spent_at, expires_at");
    const nowMs = Date.now();
    const outstanding = (creditRows ?? [])
      .filter(
        (c) => !c.spent_at && new Date(c.expires_at as string).getTime() > nowMs
      )
      .reduce((s, c) => s + ((c.amount as number) ?? 0), 0);

    return NextResponse.json({
      campaigns: ((campaigns ?? []) as CodeRow[]).map((c) => ({
        ...c,
        redeemed: tally.get(c.code) ?? 0,
      })),
      leaderboard,
      invitees,
      outstanding,
    });
  } catch (e) {
    console.error("[admin/referral] GET failed", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // scope-exempt: see GET.
  try {
    const admin = await validateAdmin();
    if (!admin.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const code = normalizeReferralCode(String(body.code ?? ""));
    const label = String(body.label ?? "").trim().slice(0, 80);
    const rawMax = Number(body.maxUses);
    const maxUses = Number.isFinite(rawMax) && rawMax > 0 ? Math.floor(rawMax) : null;
    const expiresAt = String(body.expiresAt ?? "").trim();

    if (!code || code.length < 4) {
      return NextResponse.json(
        { error: "Kode minimal 4 karakter", field: "code" },
        { status: 400 }
      );
    }
    if (code.length > REFERRAL_CODE_MAX) {
      return NextResponse.json(
        { error: `Kode maksimal ${REFERRAL_CODE_MAX} karakter`, field: "code" },
        { status: 400 }
      );
    }

    const supabase = createServerClient()!;
    const { error } = await supabase.from("referral_codes").insert({
      code,
      kind: "campaign",
      label,
      max_uses: maxUses,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });

    if (error) {
      // 23505 = the code is taken. It might be a personal or legacy code, so
      // say "sudah dipakai" rather than implying it is another campaign.
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Kode itu sudah ada. Pilih yang lain.", field: "code" },
          { status: 409 }
        );
      }
      console.error("[admin/referral] insert failed", error);
      return NextResponse.json({ error: "Gagal membuat kode" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, code });
  } catch (e) {
    console.error("[admin/referral] POST failed", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  // scope-exempt: see GET.
  try {
    const admin = await validateAdmin();
    if (!admin.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const supabase = createServerClient()!;

    const code = normalizeReferralCode(String(body.code ?? ""));
    if (!code) return NextResponse.json({ error: "Kode wajib" }, { status: 400 });
    // Campaign codes only. A personal code belongs to its owner and is not the
    // admin's to switch off from here.
    const { error } = await supabase
      .from("referral_codes")
      .update({ active: Boolean(body.active) })
      .eq("code", code)
      .eq("kind", "campaign");

    if (error) {
      console.error("[admin/referral] patch failed", error);
      return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/referral] PATCH failed", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  // scope-exempt: see GET.
  try {
    const admin = await validateAdmin();
    if (!admin.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    const url = new URL(req.url);
    const code = normalizeReferralCode(url.searchParams.get("code") ?? "");
    if (!code) return NextResponse.json({ error: "Kode wajib" }, { status: 400 });

    const supabase = createServerClient()!;

    // A code that has been redeemed is switched off, never deleted: the
    // referral_uses rows point at it, and removing it would cascade away the
    // record of who recruited whom.
    const { count } = await supabase
      .from("referral_uses")
      .select("id", { count: "exact", head: true })
      .eq("code", code);

    if ((count ?? 0) > 0) {
      await supabase
        .from("referral_codes")
        .update({ active: false })
        .eq("code", code)
        .eq("kind", "campaign");
      return NextResponse.json({
        ok: true,
        deactivated: true,
        message: "Kode sudah pernah dipakai, jadi dimatikan saja bukan dihapus.",
      });
    }

    const { error } = await supabase
      .from("referral_codes")
      .delete()
      .eq("code", code)
      .eq("kind", "campaign");

    if (error) {
      console.error("[admin/referral] delete failed", error);
      return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/referral] DELETE failed", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
