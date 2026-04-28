import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { resolveSupportSender } from "@/lib/support/server";
import type { SupportSearchHit } from "@/types";

const MAX_HITS = 50;
const MAX_QUERY_LEN = 80;

/**
 * Escape PostgreSQL ILIKE wildcards (% and _) plus the escape char (\) so
 * users searching for literal "100%" don't accidentally match anything.
 */
function escapeLikeQuery(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * GET /api/support/search?licenseKey=K&q=Q
 * Full-text-ish search via ILIKE (trigram-indexed).
 *  - Auth: admin OR conversation owner.
 *  - Filters: deleted=false, is_system=false, is_internal hidden for non-admin.
 */
export async function GET(req: NextRequest) {
  const licenseKey = req.nextUrl.searchParams.get("licenseKey");
  const rawQuery = req.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.trim().slice(0, MAX_QUERY_LEN);

  if (!licenseKey) {
    return NextResponse.json({ error: "Missing licenseKey" }, { status: 400 });
  }
  if (!query) {
    return NextResponse.json({ hits: [] });
  }

  const sender = await resolveSupportSender();
  if (!sender.licenseKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sender.isAdmin && sender.licenseKey !== licenseKey) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ hits: [] });
  }

  const supabase = createServerClient()!;
  const safeQuery = escapeLikeQuery(query);

  let q = supabase
    .from("support_messages")
    .select("id, content, sender_name, is_admin, created_at, is_internal")
    .eq("license_key", licenseKey)
    .eq("deleted", false)
    .eq("is_system", false)
    .ilike("content", `%${safeQuery}%`)
    .order("created_at", { ascending: false })
    .limit(MAX_HITS);

  if (!sender.isAdmin) {
    q = q.eq("is_internal", false);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hits: SupportSearchHit[] = (data || []).map((r) => ({
    messageId: r.id as string,
    content: (r.content as string) ?? "",
    senderName: (r.sender_name as string) ?? "",
    isAdmin: Boolean(r.is_admin),
    createdAt: r.created_at as string,
  }));

  return NextResponse.json({ hits });
}
