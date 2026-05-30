import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeEq, ScopeError } from "@/lib/auth/scope-check";
import { resolveSessionTier } from "@/lib/auth/session-tier";
import { canUseVip } from "@/lib/tier";
import type { DmDirectoryUser } from "@/types";

// ─── GET /api/dm/users ─── VIP/admin directory for the caller's scope.
// Returns every VIP/admin license in scope (online AND offline), with a
// live `online` flag merged from presence. Caller must be VIP/admin.
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    const { isAdmin, tier, licenseKey } = await resolveSessionTier();

    if (!canUseVip(isAdmin, tier)) {
      return NextResponse.json({ error: "vip_only" }, { status: 403 });
    }

    if (!isSupabaseServerConfigured) {
      const mock: DmDirectoryUser[] = [
        { licenseKey: "ADMIN1", name: "Admin", packageTier: null, isAdmin: true, online: true },
        { licenseKey: "VIPX01", name: "Rina VIP", packageTier: "vip" as const, isAdmin: false, online: false },
      ].filter((u) => u.licenseKey !== licenseKey);
      return NextResponse.json({ users: mock });
    }

    const supabase = createServerClient()!;

    // VIP + admin licenses in this scope (cross-scope guard via scopeEq).
    const { data: keyRows, error: keyErr } = await scopeEq(scope)(
      supabase
        .from("license_keys")
        .select("key, name, package_tier, is_admin")
        .or("is_admin.eq.true,package_tier.in.(vip,diamond)")
    );
    if (keyErr) throw keyErr;

    type KeyRow = {
      key: string;
      name: string | null;
      package_tier: DmDirectoryUser["packageTier"];
      is_admin: boolean | null;
    };
    const rows = ((keyRows as KeyRow[]) ?? []).filter((r) => r.key !== licenseKey);
    if (rows.length === 0) return NextResponse.json({ users: [] });

    // Merge live presence (online + fresh heartbeat) for the online flag.
    const keys = rows.map((r) => r.key);
    const { data: presenceRows } = await scopeEq(scope)(
      supabase
        .from("presence")
        .select("license_key, last_seen, online")
        .in("license_key", keys)
        .eq("online", true)
    );
    const STALE_MS = 150_000;
    const now = Date.now();
    const onlineKeys = new Set(
      ((presenceRows as { license_key: string; last_seen: string }[]) ?? [])
        .filter((p) => now - new Date(p.last_seen).getTime() < STALE_MS)
        .map((p) => p.license_key)
    );

    const users: DmDirectoryUser[] = rows
      .map((r) => ({
        licenseKey: r.key,
        name: r.name ?? "Pengguna",
        packageTier: r.package_tier ?? null,
        isAdmin: r.is_admin ?? false,
        online: onlineKeys.has(r.key),
      }))
      // Online first, then alphabetical by name.
      .sort((a, b) =>
        a.online === b.online
          ? a.name.localeCompare(b.name)
          : a.online
          ? -1
          : 1
      );

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DM users GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
