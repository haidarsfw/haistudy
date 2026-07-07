import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  resolveSupportSender,
  rowToSupportReaction,
  rateLimit,
} from "@/lib/support/server";
import { SUPPORT_REACTION_RATE_LIMIT_MS } from "@/lib/constants";
import { requireScope, scopeColumns, ScopeError } from "@/lib/auth/scope-check";

/**
 * POST /api/support/messages/[id]/reactions
 * Toggle a reaction (add if absent, remove if present).
 *  - emoji: ≤16 chars (emojis can be multi-codepoint).
 *  - Anyone in the conversation may react (admin OR conversation owner).
 *  - 6 reactions/sec rate limit per reactor.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing message id" }, { status: 400 });
    }

    const scope = await requireScope(req);

    const sender = await resolveSupportSender();
    if (!sender.licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const emoji = String(body?.emoji ?? "");
    if (!emoji || emoji.length > 16) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

    if (
      !rateLimit(
        `support:react:${sender.licenseKey}`,
        SUPPORT_REACTION_RATE_LIMIT_MS,
        1
      )
    ) {
      return NextResponse.json({ error: "Too fast" }, { status: 429 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }

    const supabase = createServerClient()!;

    // Validate message exists + get its conversation owner
    const { data: msg, error: msgErr } = await supabase
      .from("support_messages")
      .select("id, license_key")
      .eq("id", id)
      .maybeSingle();
    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }
    if (!msg) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Permission: admin OR conversation owner
    const isOwner = msg.license_key === sender.licenseKey;
    if (!sender.isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Toggle: try delete first, insert if nothing deleted
    const { data: deletedRows, error: delErr } = await supabase
      .from("support_reactions")
      .delete()
      .eq("message_id", id)
      .eq("reactor_key", sender.licenseKey)
      .eq("emoji", emoji)
      .select();
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    if (deletedRows && deletedRows.length > 0) {
      return NextResponse.json({
        success: true,
        action: "removed",
        reaction: rowToSupportReaction(deletedRows[0]),
      });
    }

    const { data: inserted, error: insErr } = await supabase
      .from("support_reactions")
      .insert({
        message_id: id,
        license_key: msg.license_key,
        reactor_key: sender.licenseKey,
        reactor_name: sender.name ?? sender.licenseKey.slice(0, 8),
        is_admin: sender.isAdmin,
        emoji,
        ...scopeColumns(scope),
      })
      .select()
      .single();
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: "added",
      reaction: rowToSupportReaction(inserted),
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * GET /api/support/messages/[id]/reactions
 * Returns all reactions for a message (used during initial fetch fallback).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing message id" }, { status: 400 });
  }

  // Only the conversation owner or an admin may read its reactions (IDOR fix).
  const sender = await resolveSupportSender();
  if (!sender.licenseKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ reactions: [] });
  }

  const supabase = createServerClient()!;

  // Authorize against the message's conversation owner.
  const { data: msg, error: msgErr } = await supabase
    .from("support_messages")
    .select("license_key")
    .eq("id", id)
    .maybeSingle();
  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }
  if (!msg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!sender.isAdmin && msg.license_key !== sender.licenseKey) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("support_reactions")
    .select("*")
    .eq("message_id", id)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    reactions: (data || []).map(rowToSupportReaction),
  });
}
