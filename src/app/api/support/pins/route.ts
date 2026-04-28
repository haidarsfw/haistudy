import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import { resolveSupportSender, rowToSupportPin } from "@/lib/support/server";

const MAX_SUPPORT_PINS = 3;

/**
 * GET /api/support/pins?licenseKey=...
 * List pinned messages for a conversation. Anyone with conv access can read
 * (admin OR conversation owner).
 */
export async function GET(req: NextRequest) {
  const licenseKey = req.nextUrl.searchParams.get("licenseKey");
  if (!licenseKey) {
    return NextResponse.json({ error: "Missing licenseKey" }, { status: 400 });
  }

  const sender = await resolveSupportSender();
  if (!sender.licenseKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sender.isAdmin && sender.licenseKey !== licenseKey) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ pins: [] });
  }

  const supabase = createServerClient()!;
  const { data, error } = await supabase
    .from("support_pinned_messages")
    .select("*")
    .eq("license_key", licenseKey)
    .order("pinned_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pins: (data || []).map(rowToSupportPin) });
}

/**
 * POST /api/support/pins  { messageId, licenseKey }
 * Pin a message (admin only). Enforces MAX_SUPPORT_PINS per conversation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messageId = String(body?.messageId ?? "");
    const licenseKey = String(body?.licenseKey ?? "");
    if (!messageId || !licenseKey) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!(await isAdminFromCookies())) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const sender = await resolveSupportSender();
    if (!sender.licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const supabase = createServerClient()!;

    // Verify message exists, not deleted, not system, belongs to this conv
    const { data: msg, error: msgErr } = await supabase
      .from("support_messages")
      .select("id, license_key, deleted, is_system")
      .eq("id", messageId)
      .maybeSingle();
    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }
    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (msg.license_key !== licenseKey) {
      return NextResponse.json(
        { error: "Message not in conversation" },
        { status: 400 }
      );
    }
    if (msg.deleted || msg.is_system) {
      return NextResponse.json(
        { error: "Cannot pin deleted or system message" },
        { status: 400 }
      );
    }

    // Check pin count for this conv
    const { count } = await supabase
      .from("support_pinned_messages")
      .select("*", { count: "exact", head: true })
      .eq("license_key", licenseKey);

    if ((count ?? 0) >= MAX_SUPPORT_PINS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_SUPPORT_PINS} pesan ter-pin`, code: "PIN_CAP_REACHED" },
        { status: 409 }
      );
    }

    const { data: inserted, error: insErr } = await supabase
      .from("support_pinned_messages")
      .insert({
        message_id: messageId,
        license_key: licenseKey,
        pinned_by: sender.licenseKey,
      })
      .select()
      .single();

    if (insErr) {
      // Unique constraint = already pinned
      if (insErr.code === "23505") {
        return NextResponse.json({ error: "Already pinned" }, { status: 409 });
      }
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pin: rowToSupportPin(inserted) });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * DELETE /api/support/pins  { messageId }
 * Unpin a message (admin only).
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const messageId = String(body?.messageId ?? "");
    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
    }

    if (!(await isAdminFromCookies())) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const supabase = createServerClient()!;
    const { error } = await supabase
      .from("support_pinned_messages")
      .delete()
      .eq("message_id", messageId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
