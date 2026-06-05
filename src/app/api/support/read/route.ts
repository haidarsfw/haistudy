import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { resolveSupportSender, rowToSupportReceipt } from "@/lib/support/server";
import { requireScope, scopeColumns, ScopeError } from "@/lib/auth/scope-check";

/**
 * POST /api/support/read  { licenseKey, upToMessageId }
 * Mark all messages in conversation `licenseKey` from the OTHER side that were
 * created at-or-before `upToMessageId` as read by current sender.
 * Returns inserted receipts (so the client can update its map directly without
 * waiting for the realtime echo).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const licenseKey = String(body?.licenseKey ?? "");
    const upToMessageId = String(body?.upToMessageId ?? "");
    if (!licenseKey || !upToMessageId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const scope = await requireScope(req);

    const sender = await resolveSupportSender();
    if (!sender.licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!sender.isAdmin && sender.licenseKey !== licenseKey) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true, marked: 0, receipts: [] });
    }

    const supabase = createServerClient()!;

    // Get the cutoff timestamp from the upTo message
    const { data: upTo, error: upErr } = await supabase
      .from("support_messages")
      .select("created_at")
      .eq("id", upToMessageId)
      .maybeSingle();
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
    if (!upTo) {
      return NextResponse.json({ error: "Cutoff message not found" }, { status: 404 });
    }
    const cutoff = upTo.created_at as string;

    // Determine the "other" side. If admin reads → mark messages from non-admin senders.
    // If user reads → mark messages from admins.
    const readerKind: "user" | "admin" = sender.isAdmin ? "admin" : "user";
    const otherIsAdmin = !sender.isAdmin;

    // Pick eligible message IDs to insert receipts for
    const { data: candidates, error: candErr } = await supabase
      .from("support_messages")
      .select("id")
      .eq("license_key", licenseKey)
      .eq("is_admin", otherIsAdmin)
      .eq("is_system", false)
      .lte("created_at", cutoff);
    if (candErr) {
      return NextResponse.json({ error: candErr.message }, { status: 500 });
    }

    const ids = (candidates || []).map((c) => c.id as string);
    if (ids.length === 0) {
      return NextResponse.json({ success: true, marked: 0, receipts: [] });
    }

    const rows = ids.map((id) => ({
      license_key: licenseKey,
      message_id: id,
      reader_kind: readerKind,
      ...scopeColumns(scope),
    }));

    // upsert with do-nothing on conflict (UNIQUE on message_id+reader_kind)
    const { data: inserted, error: insErr } = await supabase
      .from("support_read_receipts")
      .upsert(rows, { onConflict: "message_id,reader_kind", ignoreDuplicates: true })
      .select();
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      marked: inserted?.length ?? 0,
      receipts: (inserted || []).map(rowToSupportReceipt),
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * GET /api/support/read?licenseKey=...
 * Returns all read receipts for a conversation (initial load).
 */
export async function GET(req: NextRequest) {
  const licenseKey = req.nextUrl.searchParams.get("licenseKey");
  if (!licenseKey) {
    return NextResponse.json({ error: "Missing licenseKey" }, { status: 400 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ receipts: [] });
  }

  const supabase = createServerClient()!;
  const { data, error } = await supabase
    .from("support_read_receipts")
    .select("*")
    .eq("license_key", licenseKey);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    receipts: (data || []).map(rowToSupportReceipt),
  });
}
