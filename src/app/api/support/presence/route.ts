import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { resolveSupportSender } from "@/lib/support/server";

/**
 * GET /api/support/presence?licenseKey=...
 *
 *  - With a non-self licenseKey: ADMIN only - presence of that user.
 *  - Without licenseKey: returns aggregated admin presence.
 *
 * `online` is derived purely from `last_seen` freshness - we ignore the
 * persisted `presence.online` column because it is flipped to false by the
 * cleanup-presence cron and by client offline-beacons, which produces a
 * confusing flicker on the support panel even when the user is actually
 * still active. `last_seen` updates on every heartbeat (60s visible / 5min
 * hidden); a 90 s freshness window is enough to be stable across a missed
 * heartbeat.
 */

const ONLINE_FRESH_MS = 90_000;            // 90 s of slack vs heartbeat cadence
const STALE_HIDE_LASTSEEN_MS = 24 * 60 * 60 * 1000; // 24 h → suppress timestamp

interface PresenceRow {
  online?: boolean | null;
  last_seen: string;
  license_key?: string;
  hide_status?: boolean | null;
}

function aggregate(
  rows: PresenceRow[]
): { online: boolean; lastSeen: string | null } {
  if (rows.length === 0) return { online: false, lastSeen: null };
  const sorted = [...rows].sort(
    (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
  );
  const newest = sorted[0].last_seen;
  const newestAge = Date.now() - new Date(newest).getTime();
  const online = newestAge < ONLINE_FRESH_MS;
  const lastSeen = newestAge < STALE_HIDE_LASTSEEN_MS ? newest : null;
  return { online, lastSeen };
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("licenseKey");

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ online: false, lastSeen: null, kind: "admin" });
  }

  const sender = await resolveSupportSender();
  if (!sender.licenseKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient()!;

  // ── Admin asking about a specific conversation owner ──
  if (target && sender.isAdmin) {
    const { data } = await supabase
      .from("presence")
      .select("last_seen, hide_status")
      .eq("license_key", target)
      .order("last_seen", { ascending: false })
      .limit(5);

    // Respect the user's "hide status" preference - if every fresh row is
    // hidden, fall back to "no presence info".
    const rows = (data || []).filter((r) => !r.hide_status) as PresenceRow[];
    const { online, lastSeen } = aggregate(rows);
    return NextResponse.json({ online, lastSeen, kind: "user" });
  }

  // ── User asking for admin aggregate (any admin → online) ──
  const { data: admins } = await supabase
    .from("license_keys")
    .select("key")
    .eq("is_admin", true);

  const adminKeys = (admins || []).map((a) => a.key as string);
  if (adminKeys.length === 0) {
    return NextResponse.json({ online: false, lastSeen: null, kind: "admin" });
  }

  const { data: pres } = await supabase
    .from("presence")
    .select("last_seen, license_key, hide_status")
    .in("license_key", adminKeys)
    .order("last_seen", { ascending: false })
    .limit(20);

  const rows = (pres || []).filter((r) => !r.hide_status) as PresenceRow[];
  const { online, lastSeen } = aggregate(rows);
  return NextResponse.json({ online, lastSeen, kind: "admin" });
}
