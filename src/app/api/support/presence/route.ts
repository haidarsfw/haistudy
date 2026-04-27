import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { resolveSupportSender } from "@/lib/support/server";
import { SUPPORT_PRESENCE_STALE_MS } from "@/lib/constants";

/**
 * GET /api/support/presence?licenseKey=...
 *
 *  - When called with a non-self licenseKey: ADMIN only — returns presence
 *    of that conversation owner (the user).
 *  - When called by user without licenseKey: returns aggregated admin
 *    presence (any admin online → online).
 */
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
  const cutoff = new Date(Date.now() - SUPPORT_PRESENCE_STALE_MS).toISOString();

  // ── Admin asking about a specific conversation owner ──
  if (target && sender.isAdmin) {
    const { data } = await supabase
      .from("presence")
      .select("online, last_seen, hide_status")
      .eq("license_key", target)
      .order("last_seen", { ascending: false })
      .limit(5);

    const rows = (data || []).filter((r) => !r.hide_status);
    const online = rows.some(
      (r) => r.online && new Date(r.last_seen as string).toISOString() >= cutoff
    );
    const STALE_DISPLAY_MS_USER = 24 * 60 * 60 * 1000;
    let lastSeen: string | null = null;
    if (rows.length > 0) {
      const sorted = [...rows].sort(
        (a, b) =>
          new Date(b.last_seen as string).getTime() -
          new Date(a.last_seen as string).getTime()
      );
      const newest = sorted[0].last_seen as string;
      const ageMs = Date.now() - new Date(newest).getTime();
      if (ageMs < STALE_DISPLAY_MS_USER) {
        lastSeen = newest;
      }
    }

    return NextResponse.json({ online, lastSeen, kind: "user" });
  }

  // ── User asking for admin aggregate ──
  // Find all admin license keys, then check presence for any of them.
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
    .select("online, last_seen, license_key, hide_status")
    .in("license_key", adminKeys);

  const rows = (pres || []).filter((r) => !r.hide_status);
  const online = rows.some(
    (r) => r.online && new Date(r.last_seen as string).toISOString() >= cutoff
  );

  // Pick the freshest last_seen — but if all admin rows are >24h stale,
  // suppress the value so the UI shows "Belum pernah aktif" instead of a
  // misleading frozen "1 hour ago".
  const STALE_DISPLAY_MS = 24 * 60 * 60 * 1000;
  let lastSeen: string | null = null;
  if (rows.length > 0) {
    const sorted = [...rows].sort(
      (a, b) =>
        new Date(b.last_seen as string).getTime() -
        new Date(a.last_seen as string).getTime()
    );
    const newest = sorted[0].last_seen as string;
    const ageMs = Date.now() - new Date(newest).getTime();
    if (ageMs < STALE_DISPLAY_MS) {
      lastSeen = newest;
    }
  }

  return NextResponse.json({ online, lastSeen, kind: "admin" });
}
