import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  resolveSupportSender,
  rowToSupportMessage,
  rateLimit,
} from "@/lib/support/server";
import {
  SUPPORT_EDIT_RATE_LIMIT_MS,
  SUPPORT_EDIT_WINDOW_MS,
} from "@/lib/constants";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import { requireScope, scopeEq, ScopeError } from "@/lib/auth/scope-check";

/**
 * PATCH /api/support/messages/[id]
 * Edit text content of an existing message.
 *  - Only original author may edit (matched via author_license_key cookie).
 *  - 15 min window from created_at (admins also bound; keeps history honest).
 *  - 2s rate limit per author.
 *  - System / image / audio messages cannot be edited.
 */
export async function PATCH(
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
    const newContent = String(body?.content ?? "").trim().slice(0, 2000);
    if (!newContent) {
      return NextResponse.json({ error: "Empty content" }, { status: 400 });
    }

    if (!rateLimit(`support:edit:${sender.licenseKey}`, SUPPORT_EDIT_RATE_LIMIT_MS, 1)) {
      return NextResponse.json({ error: "Too fast" }, { status: 429 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const supabase = createServerClient()!;

    const { data: row, error: fetchErr } = await scopeEq(scope)(
      supabase.from("support_messages").select("*").eq("id", id)
    ).maybeSingle();
    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (row.is_system || row.deleted) {
      return NextResponse.json({ error: "Not editable" }, { status: 400 });
    }
    if (row.type !== "text") {
      return NextResponse.json({ error: "Only text editable" }, { status: 400 });
    }
    if (row.author_license_key && row.author_license_key !== sender.licenseKey) {
      return NextResponse.json({ error: "Not your message" }, { status: 403 });
    }

    const ageMs = Date.now() - new Date(row.created_at).getTime();
    if (ageMs > SUPPORT_EDIT_WINDOW_MS) {
      return NextResponse.json(
        { error: "Edit window expired", code: "EDIT_WINDOW_EXPIRED" },
        { status: 410 }
      );
    }

    const { data: updated, error: updErr } = await scopeEq(scope)(
      supabase
        .from("support_messages")
        .update({
          content: newContent,
          edited_at: new Date().toISOString(),
        })
        .eq("id", id)
    )
      .select()
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: rowToSupportMessage(updated) });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * DELETE /api/support/messages/[id]
 * Unsend a message - admin-only privilege. Soft-deletes by setting:
 *   - deleted = true
 *   - unsent_by = admin license key
 *   - unsent_at = now()
 *   - content cleared, media_url nulled
 * Then cascades:
 *   - Removes all reactions on this message
 *   - Removes from pinned messages (if pinned)
 * Realtime UPDATE event auto-propagates to both sides.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing message id" }, { status: 400 });
    }

    const scope = await requireScope(req);

    if (!(await isAdminFromCookies())) {
      return NextResponse.json(
        { error: "Admin only" },
        { status: 403 }
      );
    }

    const sender = await resolveSupportSender();
    if (!sender.licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }

    const supabase = createServerClient()!;

    const { data: row, error: fetchErr } = await scopeEq(scope)(
      supabase.from("support_messages").select("id, deleted, is_system").eq("id", id)
    ).maybeSingle();
    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (row.is_system) {
      return NextResponse.json(
        { error: "Cannot unsend system message" },
        { status: 400 }
      );
    }
    if (row.deleted) {
      return NextResponse.json(
        { error: "Already unsent" },
        { status: 409 }
      );
    }

    const { data: updated, error: updErr } = await scopeEq(scope)(
      supabase
        .from("support_messages")
        .update({
          deleted: true,
          unsent_by: sender.licenseKey,
          unsent_at: new Date().toISOString(),
          content: "",
          media_url: null,
        })
        .eq("id", id)
    )
      .select()
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // Cascade: remove reactions + pin (best-effort; failures don't undo unsend).
    // message_id is a unique UUID and the parent message was already verified
    // in-scope above, so deleting by message_id is implicitly scope-bounded.
    await supabase.from("support_reactions").delete().eq("message_id", id);
    await supabase
      .from("support_pinned_messages")
      .delete()
      .eq("message_id", id);

    return NextResponse.json({
      success: true,
      message: rowToSupportMessage(updated),
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
