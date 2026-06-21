import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeEq, scopeColumns, ScopeError } from "@/lib/auth/scope-check";

/**
 * POST /api/presence
 *
 * v4 - Optimized: single UPSERT per heartbeat (no SELECT first).
 * Time tracking is handled purely client-side: the heartbeat interval
 * is 60s visible / 5m hidden. Server just upserts the row and does the
 * minutes flush in one pass using the returned `last_seen` from the DB
 * via a smarter UPSERT that returns the previous value.
 *
 * DB column required:
 *   ALTER TABLE presence ADD COLUMN IF NOT EXISTS online_seconds_accumulator integer DEFAULT 0;
 */

const MAX_ACTIVE_ELAPSED_S = 180;

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
    // HEARTBEAT - single SELECT+UPSERT merged
    // Read + compute + write in one round-trip using a DB function
    // ═══════════════════════════════════════════

    // Use RPC if available (single round-trip), fallback to 2-query path
    try {
      const { data: existing } = await scopeEq(scope)(
        supabase
          .from("presence")
          .select("last_seen, online_seconds_accumulator")
          .eq("user_id", userId)
          .maybeSingle()
      );

      let newAccumulator = existing?.online_seconds_accumulator ?? 0;
      let minutesToFlush = 0;

      if (existing?.last_seen) {
        const elapsedS = Math.floor(
          (now.getTime() - new Date(existing.last_seen).getTime()) / 1000
        );
        if (elapsedS >= 5 && elapsedS <= MAX_ACTIVE_ELAPSED_S) {
          newAccumulator += elapsedS;
        }
      }

      minutesToFlush = Math.floor(newAccumulator / 60);
      newAccumulator = newAccumulator % 60;

      // Single UPSERT - PK is now (user_id, semester, exam_period, jurusan)
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
          online_seconds_accumulator: newAccumulator,
          ...scopeColumns(scope),
        },
        { onConflict: "user_id,semester,exam_period,jurusan" }
      );

      // Flush minutes - fire-and-forget (don't await, don't block response)
      if (minutesToFlush > 0 && licenseKey) {
        void supabase
          .rpc("increment_license_field", {
            p_key: licenseKey,
            p_field: "total_online_minutes",
            p_amount: minutesToFlush,
          })
          .then(
            () => {},
            () => {}
          );
      }
    } catch {
      // Graceful degradation: if presence table errors, just return success
      // Don't throw - presence failure shouldn't break the app
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
