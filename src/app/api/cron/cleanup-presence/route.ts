import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

/**
 * GET /api/cron/cleanup-presence
 *
 * Weekly DB hygiene (Vercel Cron — see vercel.json).
 *
 * 1. Flip stale online=true rows to offline (heartbeats are every 60s;
 *    anything > 5 min is definitely not online).
 * 2. Delete rows older than 7 days — users long gone, data unusable.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically.
 * Any unauthenticated caller gets 401 — safe to leave this endpoint public.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ skipped: "supabase not configured" });
  }

  const supabase = createServerClient()!;
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { count: flippedCount } = await supabase
    .from("presence")
    .update({ online: false, online_seconds_accumulator: 0 }, { count: "exact" })
    .eq("online", true)
    .lt("last_seen", fiveMinAgo);

  const { count: deletedCount } = await supabase
    .from("presence")
    .delete({ count: "exact" })
    .lt("last_seen", sevenDaysAgo);

  return NextResponse.json({
    ok: true,
    flippedStaleOnline: flippedCount ?? 0,
    deletedOlderThan7d: deletedCount ?? 0,
    ranAt: new Date().toISOString(),
  });
}
