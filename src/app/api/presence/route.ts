import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

/**
 * POST /api/presence
 *
 * v3 — Server-side time tracking.
 *
 * The server calculates active time by measuring the elapsed seconds
 * between consecutive heartbeats. Only short intervals (5–90s) count
 * as active time — longer gaps mean the tab was hidden or the user
 * was away.
 *
 * Accumulated seconds are stored in `presence.online_seconds_accumulator`.
 * When ≥ 60 seconds accumulate, full minutes are flushed to
 * `license_keys.total_online_minutes`.
 *
 * Required DB column (run once in Supabase SQL Editor):
 *   ALTER TABLE presence ADD COLUMN IF NOT EXISTS online_seconds_accumulator integer DEFAULT 0;
 */

// Maximum elapsed seconds between heartbeats that counts as "active".
// Heartbeats are every 30s when visible → anything ≤ 90s is valid.
// Anything larger = hidden tab (5 min heartbeats) or reconnection.
const MAX_ACTIVE_ELAPSED_S = 90;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, userName, licenseKey, deviceType, hideStatus } =
      body as {
        action: "heartbeat" | "offline";
        userId: string;
        userName?: string;
        licenseKey?: string;
        deviceType?: string;
        hideStatus?: boolean;
      };

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const now = new Date();
    const nowISO = now.toISOString();

    // ═══════════════════════════════════════════
    // OFFLINE — flush remaining seconds + mark offline
    // ═══════════════════════════════════════════
    if (action === "offline") {
      if (licenseKey) {
        try {
          // Read current accumulator and last_seen
          const { data: row } = await supabase
            .from("presence")
            .select("last_seen, online_seconds_accumulator")
            .eq("user_id", userId)
            .single();

          if (row) {
            let accumulator: number = row.online_seconds_accumulator ?? 0;

            // Add elapsed since last heartbeat if it's a valid interval
            const lastSeen = new Date(row.last_seen as string);
            const elapsedS = Math.floor(
              (now.getTime() - lastSeen.getTime()) / 1000
            );
            if (elapsedS >= 5 && elapsedS <= MAX_ACTIVE_ELAPSED_S) {
              accumulator += Math.min(elapsedS, 60);
            }

            // Flush full minutes to license_keys
            const minutes = Math.floor(accumulator / 60);
            if (minutes > 0) {
              try {
                await supabase.rpc("increment_license_field", {
                  p_key: licenseKey,
                  p_field: "total_online_minutes",
                  p_amount: minutes,
                });
              } catch (err) {
                console.error("Failed to flush minutes on offline:", err);
                // Fallback: direct update
                const { data } = await supabase
                  .from("license_keys")
                  .select("total_online_minutes")
                  .eq("key", licenseKey)
                  .single();
                if (data) {
                  await supabase
                    .from("license_keys")
                    .update({
                      total_online_minutes:
                        (data.total_online_minutes || 0) + minutes,
                    })
                    .eq("key", licenseKey);
                }
              }
            }
          }
        } catch (err) {
          console.error("Offline flush error:", err);
        }
      }

      // Mark offline, reset accumulator
      const { error: offlineError } = await supabase
        .from("presence")
        .update({
          online: false,
          last_seen: nowISO,
          online_seconds_accumulator: 0,
        })
        .eq("user_id", userId);

      // If update failed (column missing), retry without accumulator
      if (offlineError) {
        await supabase
          .from("presence")
          .update({ online: false, last_seen: nowISO })
          .eq("user_id", userId);
      }

      return NextResponse.json({ success: true });
    }

    // ═══════════════════════════════════════════
    // HEARTBEAT — track time + update presence
    // ═══════════════════════════════════════════

    // Step 1: Read existing row to get previous last_seen and accumulator
    let newAccumulator = 0;
    let minutesToFlush = 0;

    const { data: existing, error: selectError } = await supabase
      .from("presence")
      .select("last_seen, online_seconds_accumulator")
      .eq("user_id", userId)
      .single();

    // Handle case where online_seconds_accumulator column doesn't exist yet
    const hasAccumulatorColumn =
      !selectError ||
      !selectError.message?.includes("online_seconds_accumulator");

    if (hasAccumulatorColumn && existing) {
      newAccumulator = existing.online_seconds_accumulator ?? 0;

      // Step 2: Calculate elapsed since last heartbeat
      if (existing.last_seen) {
        const lastSeen = new Date(existing.last_seen as string);
        const elapsedS = Math.floor(
          (now.getTime() - lastSeen.getTime()) / 1000
        );

        // Only count as active if elapsed is within the valid range.
        // 5–90 seconds = normal visible-tab heartbeat (~30s expected).
        // Anything larger = hidden tab, reconnection, or first heartbeat.
        if (elapsedS >= 5 && elapsedS <= MAX_ACTIVE_ELAPSED_S) {
          // Cap individual addition at 60s as safety measure
          newAccumulator += Math.min(elapsedS, 60);
        }
      }

      // Step 3: Flush full minutes
      minutesToFlush = Math.floor(newAccumulator / 60);
      newAccumulator = newAccumulator % 60; // keep remainder
    }

    // Step 4: Upsert presence row
    const upsertData: Record<string, unknown> = {
      user_id: userId,
      user_name: userName || "Unknown",
      license_key: licenseKey || null,
      device_type: deviceType || "desktop",
      hide_status: hideStatus ?? false,
      online: true,
      last_seen: nowISO,
    };

    if (hasAccumulatorColumn) {
      upsertData.online_seconds_accumulator = newAccumulator;
    }

    const { error: upsertError } = await supabase
      .from("presence")
      .upsert(upsertData, { onConflict: "user_id" });

    // If upsert failed (likely missing column), retry without accumulator
    if (upsertError) {
      delete upsertData.online_seconds_accumulator;
      await supabase
        .from("presence")
        .upsert(upsertData, { onConflict: "user_id" });
      // Time tracking disabled — column missing
      minutesToFlush = 0;
    }

    // Step 5: Flush minutes to license_keys
    if (minutesToFlush > 0 && licenseKey) {
      try {
        await supabase.rpc("increment_license_field", {
          p_key: licenseKey,
          p_field: "total_online_minutes",
          p_amount: minutesToFlush,
        });
      } catch (err) {
        console.error("Failed to increment online minutes:", err);
        // Fallback: direct update
        const { data } = await supabase
          .from("license_keys")
          .select("total_online_minutes")
          .eq("key", licenseKey)
          .single();
        if (data) {
          await supabase
            .from("license_keys")
            .update({
              total_online_minutes:
                (data.total_online_minutes || 0) + minutesToFlush,
            })
            .eq("key", licenseKey);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Presence API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
