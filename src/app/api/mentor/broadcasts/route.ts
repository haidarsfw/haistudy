import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";
import { isMentorAccount } from "@/lib/mentor/groups";

/**
 * GET — the owner's latest messages to mentors, for the "Dari haistudy" card
 * on /partner. Only for someone who is a mentor right now; anyone else gets
 * an empty list (the card simply does not show).
 *
 * scope-exempt: not tied to a period. Identity from the account cookie.
 */
export async function GET() {
  try {
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) return NextResponse.json({ broadcasts: [] });
    const supabase = createServerClient()!;
    if (!(await isMentorAccount(supabase, account.id))) return NextResponse.json({ broadcasts: [] });
    const { data } = await supabase
      .from("mentor_broadcasts")
      .select("id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(3);
    return NextResponse.json({
      broadcasts: (data ?? []).map((r) => ({ id: r.id as string, body: r.body as string, createdAt: r.created_at as string })),
    });
  } catch (error) {
    if (error instanceof AccountError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Response) return error;
    console.error("[mentor/broadcasts] gagal:", error);
    return NextResponse.json({ broadcasts: [] });
  }
}
