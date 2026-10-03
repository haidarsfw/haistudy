import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { archiveEndedGroups } from "@/lib/mentor/archive";

/**
 * GET /api/cron/cleanup-presence
 *
 * Weekly DB hygiene (Vercel Cron - see vercel.json).
 *
 * 1. Flip stale online=true rows to offline (heartbeats are every 60s;
 *    anything > 5 min is definitely not online).
 * 2. Delete rows older than 7 days - users long gone, data unusable.
 * 3. Purge accounts whose 7-day deletion grace period has expired.
 * 4. Archive mentoring groups 14 days after their period's last exam.
 *
 * Runs DAILY, not weekly. It used to be weekly, which was fine for presence
 * rows but would have turned "deleted after 7 days" into "deleted somewhere
 * between 7 and 14 days" — a promise the schedule could not keep. Still one
 * cron slot either way.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically.
 * Any unauthenticated caller gets 401 - safe to leave this endpoint public.
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

  // 3. Carry out account deletions whose grace period has run out.
  //
  // Piggybacking on this job rather than adding a second cron: the Hobby plan
  // allows two, one is already spent, and burning the last slot on something
  // that runs in milliseconds would leave nothing for whatever comes next.
  //
  // The window is measured from `deletion_requested_at`, so an account is never
  // removed before its seventh day whatever time of day this runs. Cancelling
  // writes the column back to null, which takes the row out of this query
  // entirely — there is no separate "cancelled" state to keep in sync.
  const { data: purged, error: purgeErr } = await supabase
    .from("accounts")
    .delete()
    .lt("deletion_requested_at", sevenDaysAgo)
    .not("deletion_requested_at", "is", null)
    .select("id");

  if (purgeErr) {
    // Reported, never fatal. Presence hygiene already succeeded above, and a
    // deletion that waits one more day is not a failure worth losing that over.
    console.error("[cron/cleanup] account purge failed", purgeErr);
  }

  // 4. Archive mentoring groups 14 days after their period's last exam (the
  //    owner's rule, 4 Oct 2026). Same reasoning as above for riding along
  //    here instead of taking the last cron slot.
  const groupsArchived = await archiveEndedGroups(supabase).catch((e) => {
    console.error("[cron/cleanup] group archive failed", e);
    return [] as string[];
  });

  return NextResponse.json({
    ok: true,
    flippedStaleOnline: flippedCount ?? 0,
    deletedOlderThan7d: deletedCount ?? 0,
    accountsPurged: purged?.length ?? 0,
    groupsArchived: groupsArchived.length,
    ranAt: new Date().toISOString(),
  });
}
