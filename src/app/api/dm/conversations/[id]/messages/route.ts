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
  sender_name: string | null;
  body: string;
  type: string | null;
  media_url: string | null;
  reply_to_id: string | null;
  reply_to_name: string | null;
  reply_to_body: string | null;
  deleted: boolean | null;
  pinned: boolean | null;
  created_at: string;
};

function mapMsg(row: MsgRow): DmMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderKey: row.sender_key,
    senderName: row.sender_name ?? null,
    body: row.body,
    type: (row.type as DmMessage["type"]) ?? "text",
    mediaUrl: row.media_url ?? null,
    replyToId: row.reply_to_id ?? null,
    replyToName: row.reply_to_name ?? null,
    replyToBody: row.reply_to_body ?? null,
    deleted: row.deleted ?? false,
    pinned: row.pinned ?? false,
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

// ─── POST /api/dm/conversations/[id]/messages ───
// Send { body, type?, mediaUrl?, senderName?, replyTo? }.
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
    const type = (["text", "image", "audio"].includes(payload?.type)
      ? payload.type
      : "text") as DmMessage["type"];
    const body = String(payload?.body ?? "").trim();
    const mediaUrl =
      typeof payload?.mediaUrl === "string" ? payload.mediaUrl : null;
    // sender_name is display-only; sender_key stays server-trusted (cookie).
    const senderName =
      typeof payload?.senderName === "string"
        ? payload.senderName.slice(0, 80)
        : null;

    // A media message can have an empty body (caption optional); a text message
    // must carry content.
    if (type === "text" && !body) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }
    if ((type === "image" || type === "audio") && !mediaUrl) {
      return NextResponse.json({ error: "Missing media" }, { status: 400 });
    }
    if (body.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    const replyTo =
      payload?.replyTo && typeof payload.replyTo === "object"
        ? {
            id: String(payload.replyTo.id ?? ""),
            name: String(payload.replyTo.name ?? "").slice(0, 80),
            content: String(payload.replyTo.content ?? "").slice(0, 200),
          }
        : null;

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({
        message: {
          id: crypto.randomUUID(),
          conversationId: id,
          senderKey: licenseKey,
          senderName,
          body,
          type,
          mediaUrl,
          replyToId: replyTo?.id || null,
          replyToName: replyTo?.name || null,
          replyToBody: replyTo?.content || null,
          deleted: false,
          pinned: false,
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
        sender_name: senderName,
        body,
        type,
        media_url: mediaUrl,
        reply_to_id: replyTo?.id || null,
        reply_to_name: replyTo?.name || null,
        reply_to_body: replyTo?.content || null,
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

// ─── DELETE /api/dm/conversations/[id]/messages ───
// Soft-delete one message: body { messageId }. Sender or admin only.
export async function DELETE(
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
    const messageId = String(payload?.messageId ?? "");
    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const conv = await loadOwnedConversation(supabase, scope, id, licenseKey);
    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Load the target to enforce ownership (only the sender, or an admin, may
    // delete). Scope + conversation already validated above.
    const { data: target } = await supabase
      .from("dm_messages")
      .select("sender_key")
      .eq("id", messageId)
      .eq("conversation_id", id)
      .maybeSingle();
    const row = target as { sender_key: string } | null;
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isAdmin && row.sender_key.toUpperCase() !== licenseKey) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("dm_messages")
      .update({ deleted: true, body: "", media_url: null })
      .eq("id", messageId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DM messages DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PATCH /api/dm/conversations/[id]/messages ───
// Toggle pin: body { messageId, pinned }. Either participant may pin.
export async function PATCH(
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
    const messageId = String(payload?.messageId ?? "");
    const pinned = Boolean(payload?.pinned);
    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const conv = await loadOwnedConversation(supabase, scope, id, licenseKey);
    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("dm_messages")
      .update({
        pinned,
        pinned_at: pinned ? new Date().toISOString() : null,
      })
      .eq("id", messageId)
      .eq("conversation_id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DM messages PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
