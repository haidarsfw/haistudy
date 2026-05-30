import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import {
  requireScope,
  scopeEq,
  scopeColumns,
  ScopeError,
} from "@/lib/auth/scope-check";
import { resolveSessionTier } from "@/lib/auth/session-tier";
import { canUseVip } from "@/lib/tier";
import { orderedPair, otherParticipant } from "@/lib/dm";
import type { DmConversation } from "@/types";

type ConvRow = {
  id: string;
  participants: [string, string];
  semester: number;
  exam_period: DmConversation["examPeriod"];
  jurusan: string;
  last_message_at: string;
  created_at: string;
};

function mapConv(row: ConvRow, me: string): DmConversation {
  return {
    id: row.id,
    participants: row.participants,
    semester: row.semester,
    examPeriod: row.exam_period,
    jurusan: row.jurusan,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    otherKey: otherParticipant(row.participants, me) ?? undefined,
  };
}

// ─── GET /api/dm/conversations ─── list the caller's conversations, enriched
// with the other participant's name/tier/online flag and last message body.
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    const { isAdmin, tier, licenseKey } = await resolveSessionTier();
    if (!canUseVip(isAdmin, tier)) {
      return NextResponse.json({ error: "vip_only" }, { status: 403 });
    }
    if (!licenseKey) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ conversations: [] });
    }

    const supabase = createServerClient()!;

    const { data: convRows, error: convErr } = await scopeEq(scope)(
      supabase
        .from("dm_conversations")
        .select("*")
        .contains("participants", [licenseKey])
        .order("last_message_at", { ascending: false })
        .limit(100)
    );
    if (convErr) throw convErr;

    const convs = ((convRows as ConvRow[]) ?? []).map((r) => mapConv(r, licenseKey));
    if (convs.length === 0) return NextResponse.json({ conversations: [] });

    const otherKeys = [
      ...new Set(convs.map((c) => c.otherKey).filter(Boolean) as string[]),
    ];

    // Enrich: names/tiers/admin from license_keys (scope-guarded).
    const { data: keyRows } = await scopeEq(scope)(
      supabase
        .from("license_keys")
        .select("key, name, package_tier, is_admin")
        .in("key", otherKeys)
    );
    type KeyRow = {
      key: string;
      name: string | null;
      package_tier: DmConversation["otherTier"];
      is_admin: boolean | null;
    };
    const keyMap = new Map<string, KeyRow>(
      ((keyRows as KeyRow[]) ?? []).map((r) => [r.key, r])
    );

    // Online flags from presence.
    const { data: presenceRows } = await scopeEq(scope)(
      supabase
        .from("presence")
        .select("license_key, last_seen, online")
        .in("license_key", otherKeys)
        .eq("online", true)
    );
    const STALE_MS = 150_000;
    const now = Date.now();
    const onlineKeys = new Set(
      ((presenceRows as { license_key: string; last_seen: string }[]) ?? [])
        .filter((p) => now - new Date(p.last_seen).getTime() < STALE_MS)
        .map((p) => p.license_key)
    );

    // Last message body per conversation (most recent row each).
    const { data: lastMsgs } = await scopeEq(scope)(
      supabase
        .from("dm_messages")
        .select("conversation_id, body, created_at")
        .in(
          "conversation_id",
          convs.map((c) => c.id)
        )
        .order("created_at", { ascending: false })
    );
    const lastBodyMap = new Map<string, string>();
    for (const m of (lastMsgs as { conversation_id: string; body: string }[]) ?? []) {
      if (!lastBodyMap.has(m.conversation_id)) {
        lastBodyMap.set(m.conversation_id, m.body);
      }
    }

    const enriched = convs.map((c) => {
      const k = c.otherKey ? keyMap.get(c.otherKey) : undefined;
      return {
        ...c,
        otherName: k?.name ?? "Pengguna",
        otherTier: k?.package_tier ?? null,
        otherIsAdmin: k?.is_admin ?? false,
        otherOnline: c.otherKey ? onlineKeys.has(c.otherKey) : false,
        lastBody: lastBodyMap.get(c.id) ?? null,
      };
    });

    return NextResponse.json({ conversations: enriched });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DM conversations GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/dm/conversations ─── create (or fetch existing) a 1:1 with
// { target: licenseKey }. Caller and target must both be VIP/admin in scope.
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request);
    const { isAdmin, tier, licenseKey } = await resolveSessionTier();
    if (!canUseVip(isAdmin, tier)) {
      return NextResponse.json({ error: "vip_only" }, { status: 403 });
    }
    if (!licenseKey) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const target = String(body?.target ?? "").toUpperCase();
    if (!target || target === licenseKey) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    const [a, b] = orderedPair(licenseKey, target);

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({
        conversation: {
          id: `mock-${a}-${b}`,
          participants: [a, b],
          semester: scope.semester,
          examPeriod: scope.examPeriod,
          jurusan: scope.jurusan,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          otherKey: target,
        } satisfies DmConversation,
      });
    }

    const supabase = createServerClient()!;

    // Target must be a VIP/admin license in the caller's scope.
    const { data: targetRow } = await scopeEq(scope)(
      supabase
        .from("license_keys")
        .select("key, package_tier, is_admin")
        .eq("key", target)
        .maybeSingle()
    );
    const tRow = targetRow as
      | { package_tier: string | null; is_admin: boolean | null }
      | null;
    if (!tRow || !canUseVip(Boolean(tRow.is_admin), (tRow.package_tier ?? "normal") as never)) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    // Idempotent: unique index on (participants, scope) means the pair maps to
    // one row. Try to find it first, else insert. Two `contains` calls assert
    // set-equality for the 2-element array (avoids brittle array-eq encoding).
    const { data: existing } = await scopeEq(scope)(
      supabase
        .from("dm_conversations")
        .select("*")
        .contains("participants", [a])
        .contains("participants", [b])
        .maybeSingle()
    );
    if (existing) {
      return NextResponse.json({
        conversation: mapConv(existing as ConvRow, licenseKey),
      });
    }

    const { data: created, error: insErr } = await supabase
      .from("dm_conversations")
      .insert({ participants: [a, b], ...scopeColumns(scope) })
      .select()
      .single();
    if (insErr) throw insErr;

    return NextResponse.json({
      conversation: mapConv(created as ConvRow, licenseKey),
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DM conversations POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
