import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { scopeKey } from "@/lib/scope";

/**
 * GET /api/exam/history?subjectId=bizethics&attemptId=xxx
 *
 * Fetch exam attempt history. If attemptId is provided, returns
 * full detail (including grading_results). Otherwise returns summaries.
 */
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    const sk = scopeKey(scope);

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const attemptId = searchParams.get("attemptId");

    // subjectId is required only for the LIST branch. The detail branch
    // (?attemptId=) is already scoped by license_key + id, so it doesn't need
    // one — the caller's own analytics page fetches detail by attemptId alone.
    if (!subjectId && !attemptId) {
      return NextResponse.json(
        { error: "subjectId is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const licenseKey =
      cookieStore.get("hs-session")?.value?.trim().toUpperCase() ?? "";
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ attempts: [] });
    }

    const supabase = createServerClient()!;

    if (attemptId) {
      // Full detail for a specific attempt
      const { data: attempt } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("id", attemptId)
        .eq("license_key", licenseKey)
        .maybeSingle();

      if (!attempt) {
        return NextResponse.json(
          { error: "Attempt not found" },
          { status: 404 }
        );
      }

      // Parse JSON fields
      const parsed = {
        ...attempt,
        answers:
          typeof attempt.answers === "string"
            ? JSON.parse(attempt.answers)
            : attempt.answers,
        grading_results:
          typeof attempt.grading_results === "string"
            ? JSON.parse(attempt.grading_results)
            : attempt.grading_results,
      };

      return NextResponse.json({ attempt: parsed });
    }

    // List all attempts for this subject
    const { data: attempts } = await supabase
      .from("exam_attempts")
      .select(
        "id, total_score, max_score, score_pct, started_at, submitted_at, duration_used_seconds, auto_submitted, status, exam_language, created_at"
      )
      .eq("license_key", licenseKey)
      .eq("scope_key", sk)
      .eq("subject_id", subjectId)
      .neq("status", "abandoned")
      .order("created_at", { ascending: false });

    return NextResponse.json({ attempts: attempts ?? [] });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Exam history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exam/history
 *
 * Delete a specific exam attempt by ID. Only the owner can delete
 * their own attempts.
 */
export async function DELETE(request: Request) {
  try {
    const scope = await requireScope(request.clone());
    const sk = scopeKey(scope);

    const body = await request.json();
    const { attemptId } = body;

    if (!attemptId) {
      return NextResponse.json(
        { error: "attemptId is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const licenseKey =
      cookieStore.get("hs-session")?.value?.trim().toUpperCase() ?? "";
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ ok: true });
    }

    const supabase = createServerClient()!;

    // Delete only if it belongs to the user
    const { error: deleteError } = await supabase
      .from("exam_attempts")
      .delete()
      .eq("id", attemptId)
      .eq("license_key", licenseKey);

    if (deleteError) {
      console.error("Delete exam attempt error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete attempt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Delete exam attempt error:", error);
    return NextResponse.json(
      { error: "Failed to delete attempt" },
      { status: 500 }
    );
  }
}
