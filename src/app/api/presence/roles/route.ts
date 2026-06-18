import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";

/**
 * POST /api/presence/roles  { keys: string[] }
 *
 * Resolves rank info (is_admin / is_tester / package_tier) for a set of license
 * keys, server-side. `license_keys` is locked from the anon client (migrations
 * 043/044), so the old client-side `fetchOnlineUsers` query 403'd — this moves
 * the lookup behind the service_role key. Identity is scope-agnostic (a key's
 * rank doesn't change per scope), so no scope filter on the key set; requireScope
 * still gates the caller to a valid session.
 */
export async function POST(request: Request) {
  try {
    await requireScope(request);

    const body = await request.json().catch(() => null);
    const keys = Array.isArray(body?.keys)
      ? (body.keys as unknown[]).filter((k): k is string => typeof k === "string")
      : [];

    if (keys.length === 0 || !isSupabaseServerConfigured) {
      return NextResponse.json({ roles: {} });
    }

    // Cap the batch so a malicious caller can't request the whole table.
    const uniqueKeys = Array.from(new Set(keys)).slice(0, 300);

    const supabase = createServerClient()!;
    const { data: licenses } = await supabase
      .from("license_keys")
      .select("key, is_admin, is_tester, package_tier")
      .in("key", uniqueKeys);

    const roles: Record<
      string,
      {
        isAdmin: boolean;
        isTester: boolean;
        packageTier: "share" | "normal" | "vip" | "diamond" | null;
      }
    > = {};
    for (const l of licenses || []) {
      roles[l.key as string] = {
        isAdmin: Boolean(l.is_admin),
        isTester: Boolean(l.is_tester),
        packageTier:
          (l.package_tier as "share" | "normal" | "vip" | "diamond" | null) ??
          null,
      };
    }

    return NextResponse.json({ roles });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Presence roles error:", error);
    // Non-fatal for the caller: an empty map just means no badges this refresh.
    return NextResponse.json({ roles: {} });
  }
}
