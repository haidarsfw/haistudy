import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isAdminFromSession } from "@/lib/auth/admin-guard";
import { requireScope, scopeEq, ScopeError } from "@/lib/auth/scope-check";
import { canUseVip, type PackageTier } from "@/lib/tier";

// Cheap unread counter for the always-on chat red dot. The browser anon client
// cannot SELECT chat_messages directly (locked in migrations 043/044), so the
// count runs server-side behind the service_role key. Own messages are excluded
// by the caller's device id (chat_messages.author_id is a device fingerprint).

async function resolveTier(): Promise<{ isAdmin: boolean; tier: PackageTier }> {
  const isAdmin = await isAdminFromSession();
  if (!isSupabaseServerConfigured) return { isAdmin, tier: "normal" };
  const jar = await cookies();
  const lk = jar.get("hs-session")?.value ?? "";
  if (!lk) return { isAdmin, tier: "normal" };
  const supabase = createServerClient()!;
  const { data } = await supabase
    .from("license_keys")
    .select("package_tier")
    .eq("key", lk)
    .single();
  const tier = ((data as { package_tier?: PackageTier } | null)?.package_tier ??
    "normal") as PackageTier;
  return { isAdmin, tier };
}

export async function POST(req: Request) {
  try {
    const scope = await requireScope(req);
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ global: 0, vipLounge: 0 });
    }

    const body = await req.json().catch(() => ({}));
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
    const reads = (body?.reads ?? {}) as Record<string, unknown>;
    const EPOCH = new Date(0).toISOString();
    const globalRead =
      typeof reads.global === "string" ? reads.global : EPOCH;
    const vipRead =
      typeof reads["vip-lounge"] === "string"
        ? (reads["vip-lounge"] as string)
        : EPOCH;

    const supabase = createServerClient()!;
    const { isAdmin, tier } = await resolveTier();
    const allowVip = canUseVip(isAdmin, tier);

    const countChannel = async (
      ch: "global" | "vip-lounge",
      since: string
    ): Promise<number> => {
      let q = supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("channel", ch)
        .eq("deleted", false)
        .gt("created_at", since);
      if (deviceId) q = q.neq("author_id", deviceId);
      q = scopeEq(scope)(q);
      const { count } = await q;
      return count ?? 0;
    };

    const [global, vipLounge] = await Promise.all([
      countChannel("global", globalRead),
      allowVip ? countChannel("vip-lounge", vipRead) : Promise.resolve(0),
    ]);

    return NextResponse.json({ global, vipLounge });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("chat unread count error:", error);
    return NextResponse.json({ global: 0, vipLounge: 0 });
  }
}
