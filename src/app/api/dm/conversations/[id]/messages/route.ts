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
import type { DmMessage } from "@/types";

type MsgRow = {
  id: string;
  conversation_id: string;
  sender_key: string;
  body: string;
  created_at: string;
};

function mapMsg(row: MsgRow): DmMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderKey: row.sender_key,
    body: row.body,
    createdAt: row.created_at,
  };
}

// A conversation belongs to the caller iff they are one of its participants
// AND it is in their scope. Returns the row or null.
async function loadOwnedConversation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  scope: Awaited<ReturnType<typeof requireScope>>,
  conversationId: string,
  licenseKey: string
): Promise<{ participants: string[] } | null> {
  const { data } = await scopeEq(scope)(
    supabase
      .from("dm_conversations")
      .select("participants")
      .eq("id", conversationId)
      .maybeSingle()
  );
  const row = data as { participants: string[] } | null;
  if (!row || !row.participants.includes(licenseKey)) return null;
  return row;
}

// ─── GET /api/dm/conversations/[id]/messages ─── list (chronological).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scope = await requireScope(request);
    const { isAdmin, tier, licenseKey } = await resolveSessionTier();
    if (!canUseVip(isAdmin, tier)) {
      return NextResponse.json({ error: "vip_only" }, { status: 403 });
    }
    if (!licenseKey) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ messages: [] });
    }

    const supabase = createServerClient()!;
    const conv = await loadOwnedConversation(supabase, scope, id, licenseKey);
    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");

    let query = supabase
      .from("dm_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    query = scopeEq(scope)(query);
    if (before) query = query.lt("created_at", before);

    const { data, error } = await query;
    if (error) throw error;

    const messages = ((data as MsgRow[]) ?? []).map(mapMsg).reverse();
    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DM messages GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/dm/conversations/[id]/messages ─── send { body }.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scope = await requireScope(request);
    const { isAdmin, tier, licenseKey } = await resolveSessionTier();
    if (!canUseVip(isAdmin, tier)) {
      return NextResponse.json({ error: "vip_only" }, { status: 403 });
    }
    if (!licenseKey) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const body = String(payload?.body ?? "").trim();
    if (!body) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }
    if (body.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({
        message: {
          id: crypto.randomUUID(),
          conversationId: id,
          senderKey: licenseKey,
          body,
          createdAt: new Date().toISOString(),
        } satisfies DmMessage,
      });
    }

    const supabase = createServerClient()!;
    const conv = await loadOwnedConversation(supabase, scope, id, licenseKey);
    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("dm_messages")
      .insert({
        conversation_id: id,
        sender_key: licenseKey,
        body,
        ...scopeColumns(scope),
      })
      .select()
      .single();
    if (error) throw error;

    // Bump conversation ordering.
    await supabase
      .from("dm_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ message: mapMsg(data as MsgRow) });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DM messages POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
