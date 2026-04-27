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

    const { data: row, error: fetchErr } = await supabase
      .from("support_messages")
      .select("*")
      .eq("id", id)
      .maybeSingle();
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

    const { data: updated, error: updErr } = await supabase
      .from("support_messages")
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: rowToSupportMessage(updated) });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
