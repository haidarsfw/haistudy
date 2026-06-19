import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { scopeKey } from "@/lib/scope";
import type { PackageTier } from "@/lib/tier";

function maxAttempts(
  isAdmin: boolean,
  tier: PackageTier | null | undefined
): number {
  if (isAdmin) return -1; // -1 = unlimited (shown as ∞ on frontend)
  switch (tier) {
    case "diamond":
      return 5;
    case "vip":
      return 3;
    default:
      return 2;
  }
}

/**
 * POST /api/exam/start
 *
 * Creates a new exam attempt. Enforces tier-based quotas.
 * Body: { subjectId, examId, examLanguage }
 */
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request.clone());

    const body = await request.json();
    const sk = scopeKey(scope);
    const { subjectId, examId, examLanguage = "id" } = body as {
      subjectId: string;
      examId: string;
      examLanguage?: "en" | "id";
    };

    if (!subjectId || !examId) {
      return NextResponse.json(
        { error: "subjectId and examId are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const licenseKey = cookieStore.get("hs-session")?.value?.trim().toUpperCase() ?? "";
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      // Dev/mock: always allow
      return NextResponse.json({
        attemptId: crypto.randomUUID(),
        startedAt: new Date().toISOString(),
        quota: { used: 1, max: 999, remaining: 998 },
      });
    }

    const supabase = createServerClient()!;

    // Get user tier + admin status
    const { data: license } = await supabase
      .from("license_keys")
      .select("package_tier, is_admin")
      .eq("key", licenseKey)
      .maybeSingle();

    if (!license) {
      return NextResponse.json({ error: "Invalid license" }, { status: 401 });
    }

    const isAdmin = Boolean(license.is_admin);
    const tier = (license.package_tier as PackageTier) ?? "normal";
    const max = maxAttempts(isAdmin, tier);

    // Count existing non-abandoned attempts
    const { count, error: countError } = await supabase
      .from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .eq("license_key", licenseKey)
      .eq("scope_key", sk)
      .eq("subject_id", subjectId)
      .neq("status", "abandoned");

    // If table doesn't exist yet (migration not run), treat as 0 used
    if (countError) {
      console.error("Exam quota count error (table may not exist):", countError.message);
    }

    const used = count ?? 0;

    if (max !== -1 && used >= max) {
      return NextResponse.json(
        {
          error: "Kuota latihan soal habis",
          quota: { used, max, remaining: 0 },
        },
        { status: 429 }
      );
    }

    // Create new attempt
    const startedAt = new Date().toISOString();
    const { data: attempt, error: insertError } = await supabase
      .from("exam_attempts")
      .insert({
        license_key: licenseKey,
        scope_key: sk,
        subject_id: subjectId,
        exam_id: examId,
        started_at: startedAt,
        exam_language: examLanguage,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (insertError || !attempt) {
      console.error("Failed to create exam attempt:", insertError?.message, insertError?.details, insertError?.hint);
      return NextResponse.json(
        { error: `Gagal memulai ujian: ${insertError?.message ?? "unknown"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attemptId: attempt.id,
      startedAt,
      quota: {
        used: used + 1,
        max,
        remaining: Math.max(0, max - used - 1),
      },
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Exam start error:", msg, error);
    return NextResponse.json(
      { error: `Gagal memulai ujian: ${msg}` },
      { status: 500 }
    );
  }
}
