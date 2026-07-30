import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { FEEDBACK_DISCOUNT_PERCENT } from "@/lib/referral/feedback-discount";

/**
 * The evaluation thank-you allowlist.
 *
 * A table rather than a list in the code, so next round's addresses can be
 * pasted in without a deploy. That is the entire reason this route exists.
 *
 * scope-exempt: the discount follows a person, not an exam period. Someone who
 * filled in the semester 2 evaluation should still get it when they buy
 * semester 3, so scoping it would defeat the point.
 */

const MAX_ROWS = 500;
/** One paste, capped. Enough for any realistic round, small enough to reject junk. */
const MAX_PER_PASTE = 200;

interface Row {
  email_lower: string;
  percent: number;
  note: string | null;
  created_at: string;
  used_at: string | null;
  used_amount: number | null;
}

/** Addresses out of a pasted blob: newlines, commas, semicolons or spaces. */
function parseEmails(raw: string): { valid: string[]; invalid: string[] } {
  const parts = String(raw ?? "")
    .split(/[\s,;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    // Deliberately loose. Rejecting an address that is merely unusual would
    // silently deny someone a discount they earned; the worst a junk row can
    // do is sit there matching nobody.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p) || p.length > 254) {
      invalid.push(p);
      continue;
    }
    if (seen.has(p)) continue;
    seen.add(p);
    valid.push(p);
  }
  return { valid, invalid };
}

export async function GET() {
  try {
    const admin = await validateAdmin();
    if (!admin.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("feedback_discounts")
      .select("email_lower, percent, note, created_at, used_at, used_amount")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);

    if (error) throw error;

    const rows = (data ?? []) as Row[];
    return NextResponse.json({
      rows,
      defaultPercent: FEEDBACK_DISCOUNT_PERCENT,
      total: rows.length,
      used: rows.filter((r) => r.used_at).length,
    });
  } catch (err) {
    console.error("[admin/feedback-discount] GET", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await validateAdmin();
    if (!admin.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    const body = (await request.json()) as {
      emails?: string;
      percent?: number;
      note?: string;
    };

    const { valid, invalid } = parseEmails(body.emails ?? "");
    if (!valid.length) {
      return NextResponse.json(
        { error: "Tidak ada alamat email yang bisa dibaca." },
        { status: 400 }
      );
    }
    if (valid.length > MAX_PER_PASTE) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_PER_PASTE} alamat sekali tempel.` },
        { status: 400 }
      );
    }

    const percentRaw = Number(body.percent);
    const percent =
      Number.isFinite(percentRaw) && percentRaw > 0 && percentRaw <= 100
        ? Math.round(percentRaw)
        : FEEDBACK_DISCOUNT_PERCENT;
    const note = String(body.note ?? "").trim().slice(0, 120) || null;

    const supabase = createServerClient()!;

    // ignoreDuplicates, not overwrite: an address already in the list may have
    // SPENT its discount, and re-pasting last round's export must not quietly
    // hand it back. Adding someone again is a no-op, which is what an admin
    // pasting an overlapping list expects.
    const { data, error } = await supabase
      .from("feedback_discounts")
      .upsert(
        valid.map((email_lower) => ({ email_lower, percent, note })),
        { onConflict: "email_lower", ignoreDuplicates: true }
      )
      .select("email_lower");

    if (error) throw error;

    const added = (data ?? []).length;
    return NextResponse.json({
      ok: true,
      added,
      skipped: valid.length - added,
      invalid,
    });
  } catch (err) {
    console.error("[admin/feedback-discount] POST", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await validateAdmin();
    if (!admin.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const email = (searchParams.get("email") ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const supabase = createServerClient()!;
    // Only unused rows can be removed. Deleting a spent one would erase the
    // record that it was spent, and the same address could then be added back
    // and claim the discount a second time.
    const { data, error } = await supabase
      .from("feedback_discounts")
      .delete()
      .eq("email_lower", email)
      .is("used_at", null)
      .select("email_lower");

    if (error) throw error;
    if (!data?.length) {
      return NextResponse.json(
        { error: "Tidak dihapus: alamat itu sudah memakai potongannya." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/feedback-discount] DELETE", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
