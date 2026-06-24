import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeEq, scopeColumns, ScopeError } from "@/lib/auth/scope-check";

/**
 * POST /api/presence
 *
 * v5 - Heartbeat = ONE upsert, no prior read. The client beats every 5m
 * (visible) / 15m (hidden); the server just refreshes last_seen/online so the
 * row stays "online". Online-minute accumulation is intentionally OFF (the beat
 * interval far exceeds any active-elapsed window, so it counted ~nothing), which
 * means there is nothing to read first — a lone UPSERT is the lightest per-beat
 * write for the Supabase free-tier Disk IO budget (no SELECT, no license flush).
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action,
      userId,
      userName,
      licenseKey,
      deviceType,
      hideStatus,
      currentSubject,
    } = body as {
      action: "heartbeat" | "offline";
      userId: string;
      userName?: string;
      licenseKey?: string;
      deviceType?: string;
      hideStatus?: boolean;
      currentSubject?: string | null;
    };

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Scope enforcement - presence is scoped per (user_id, scope)
    const scope = await requireScope(request);

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const now = new Date();
    const nowISO = now.toISOString();

    // ═══════════════════════════════════════════
    // OFFLINE - lightweight beacon handler
    // ═══════════════════════════════════════════
    if (action === "offline") {
      // Single UPDATE - scoped
      await scopeEq(scope)(
        supabase
          .from("presence")
          .update({
            online: false,
            last_seen: nowISO,
            online_seconds_accumulator: 0,
          })
          .eq("user_id", userId)
      );

      return NextResponse.json({ success: true });
    }

    // ═══════════════════════════════════════════
    // HEARTBEAT - single UPSERT, no prior read
    // ═══════════════════════════════════════════
    try {
      // PK is (user_id, semester, exam_period, jurusan). Omitting
      // online_seconds_accumulator keeps any existing value on conflict and the
      // column default (0) on insert — accumulation is disabled, so we never
      // read it back.
      await supabase.from("presence").upsert(
        {
          user_id: userId,
          user_name: userName || "Unknown",
          license_key: licenseKey || null,
          device_type: deviceType || "desktop",
          hide_status: hideStatus ?? false,
          current_subject: currentSubject ?? null,
          online: true,
          last_seen: nowISO,
          ...scopeColumns(scope),
        },
        { onConflict: "user_id,semester,exam_period,jurusan" }
      );
    } catch {
      // Graceful degradation: if presence table errors, just return success.
      // Don't throw - presence failure shouldn't break the app.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Presence is non-critical. If the request has no/invalid scope cookie
    // (e.g. preview sessions, or a heartbeat racing login/logout), no-op with
    // 200 instead of a 401/403 so it doesn't spam the browser console.
    if (error instanceof ScopeError) {
      return NextResponse.json({ success: true, skipped: true });
    }
    console.error("Presence API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
