import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeEq, ScopeError } from "@/lib/auth/scope-check";
import { resolveSessionTier } from "@/lib/auth/session-tier";
import { canUseVip } from "@/lib/tier";

// ─── POST /api/dm/conversations/[id]/read ───
// Mark the conversation read up to NOW for the caller (last-read pointer).
// Light: a single upsert, called when a thread is opened/focused — NOT per
// message. Powers read receipts (other side's pointer) + unread counts.
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
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    // Ownership: caller must be a participant of this conversation in this scope.
    const { data: conv } = await scopeEq(scope)(
      supabase
        .from("dm_conversations")
        .select("participants")
        .eq("id", id)
        .maybeSingle()
    );
    const row = conv as { participants: string[] } | null;
    if (!row || !row.participants.includes(licenseKey)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await supabase.from("dm_reads").upsert(
      {
        conversation_id: id,
        license_key: licenseKey,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id,license_key" }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DM read POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
