import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

/**
 * POST /api/presence
 *
 * Handles presence heartbeat and offline signals.
 * Uses service_role key (bypasses RLS) so presence writes always succeed.
 *
 * Body: { action: "heartbeat"|"offline", userId, userName?, licenseKey?, deviceType?, hideStatus? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, userName, licenseKey, deviceType, hideStatus, syncMinutes, minutesToSync } =
      body as {
        action: "heartbeat" | "offline";
        userId: string;
        userName?: string;
        licenseKey?: string;
        deviceType?: string;
        hideStatus?: boolean;
        syncMinutes?: boolean;
        minutesToSync?: number;
      };

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;

    if (action === "offline") {
      // Sync accumulated visible minutes before going offline
      if (syncMinutes && licenseKey && minutesToSync && minutesToSync > 0) {
        try {
          await supabase.rpc("increment_license_field", {
            p_key: licenseKey,
            p_field: "total_online_minutes",
            p_amount: minutesToSync,
          });
        } catch (err) {
          console.error("Failed to sync minutes on offline:", err);
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
                total_online_minutes: (data.total_online_minutes || 0) + minutesToSync,
              })
              .eq("key", licenseKey);
          }
        }
      }
      await supabase
        .from("presence")
        .update({ online: false, last_seen: new Date().toISOString() })
        .eq("user_id", userId);
      return NextResponse.json({ success: true });
    }

    // ── Heartbeat ──
    const now = new Date().toISOString();

    // Upsert presence row
    await supabase.from("presence").upsert(
      {
        user_id: userId,
        user_name: userName || "Unknown",
        license_key: licenseKey || null,
        device_type: deviceType || "desktop",
        hide_status: hideStatus ?? false,
        online: true,
        last_seen: now,
      },
      { onConflict: "user_id" }
    );

    // Check if 5-minute online-minutes sync is due
    if (licenseKey) {
      const { data: row } = await supabase
        .from("presence")
        .select("last_seen")
        .eq("user_id", userId)
        .single();

      // The last_seen was just updated to `now`, so we compare against
      // a "sync marker". We use a simple approach: the server increments
      // online minutes every heartbeat call where the client signals
      // that 5 minutes of visible time have elapsed.
      // The client sends syncMinutes: true when it's time.
      if (syncMinutes) {
        const amount = minutesToSync && minutesToSync > 0 ? minutesToSync : 2;
        try {
          await supabase.rpc("increment_license_field", {
            p_key: licenseKey,
            p_field: "total_online_minutes",
            p_amount: amount,
          });
        } catch (err) {
          console.error("Failed to increment online minutes via RPC:", err);
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
                  (data.total_online_minutes || 0) + amount,
              })
              .eq("key", licenseKey);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Presence API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
