import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { parseScopeKey, isPurchasableScope } from "@/lib/scope";
import { normalizeClassCode } from "@/data/landing/campus";

/**
 * The class promo: one class, one exam period, one percentage.
 *
 * Exists so next semester's promo is a row rather than a deploy. The old shape
 * was `LE86_SHARE_PRICE = 20000` in the source, which could not express "only
 * this period" and so kept discounting a class the owner had already left.
 *
 * scope-exempt: the row names its own period, and the admin picking it is
 * choosing which period to write — there is no ambient scope to enforce.
 */

interface Row {
  class_code: string;
  semester: number;
  exam_period: string;
  jurusan: string;
  percent: number;
  note: string | null;
  created_at: string;
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
      .from("class_discounts")
      .select("class_code, semester, exam_period, jurusan, percent, note, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ rows: (data ?? []) as Row[] });
  } catch (err) {
    console.error("[admin/class-discount] GET", err);
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
      classCode?: string;
      scopeKey?: string;
      percent?: number;
      note?: string;
    };

    // Normalized the same way checkout normalizes what a buyer types, so a
    // promo entered as "le-86" still matches someone who typed "LE86".
    const classCode = normalizeClassCode(body.classCode ?? "");
    if (!classCode) {
      return NextResponse.json({ error: "Kode kelas wajib diisi." }, { status: 400 });
    }

    const scope = parseScopeKey(body.scopeKey ?? "");
    if (!scope) {
      return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
    }
    // A promo on a period nobody can buy is a promo nobody can use. Better to
    // refuse it now than to have it sit there looking configured.
    if (!isPurchasableScope(scope)) {
      return NextResponse.json(
        { error: "Periode itu belum bisa dibeli, jadi promonya tidak akan terpakai." },
        { status: 400 }
      );
    }

    const percentRaw = Number(body.percent);
    const percent =
      Number.isFinite(percentRaw) && percentRaw > 0 && percentRaw <= 100
        ? Math.round(percentRaw)
        : 15;
    const note = String(body.note ?? "").trim().slice(0, 120) || null;

    const supabase = createServerClient()!;
    // Upsert, not insert: re-entering the same class and period is how a
    // percentage gets corrected, and it should not fail with a unique-key error.
    const { error } = await supabase.from("class_discounts").upsert(
      {
        class_code: classCode,
        semester: scope.semester,
        exam_period: scope.examPeriod,
        jurusan: scope.jurusan,
        percent,
        note,
      },
      { onConflict: "class_code,semester,exam_period,jurusan" }
    );
    if (error) throw error;

    return NextResponse.json({ ok: true, classCode, percent });
  } catch (err) {
    console.error("[admin/class-discount] POST", err);
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
    const classCode = normalizeClassCode(searchParams.get("classCode") ?? "");
    const scope = parseScopeKey(searchParams.get("scopeKey") ?? "");
    if (!classCode || !scope) {
      return NextResponse.json({ error: "classCode dan scopeKey wajib" }, { status: 400 });
    }

    const supabase = createServerClient()!;
    const { error } = await supabase
      .from("class_discounts")
      .delete()
      .eq("class_code", classCode)
      .eq("semester", scope.semester)
      .eq("exam_period", scope.examPeriod)
      .eq("jurusan", scope.jurusan);
    if (error) throw error;

    // Deleting only stops FUTURE orders getting it. Orders already placed keep
    // the amount they were quoted, which is the correct outcome: the buyer was
    // told a number and transferred it.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/class-discount] DELETE", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
