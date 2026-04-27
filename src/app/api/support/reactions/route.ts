import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { rowToSupportReaction } from "@/lib/support/server";

/**
 * GET /api/support/reactions?licenseKey=...
 * Returns all reactions in a conversation (initial load).
 */
export async function GET(req: NextRequest) {
  const licenseKey = req.nextUrl.searchParams.get("licenseKey");
  if (!licenseKey) {
    return NextResponse.json({ error: "Missing licenseKey" }, { status: 400 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ reactions: [] });
  }

  const supabase = createServerClient()!;
  const { data, error } = await supabase
    .from("support_reactions")
    .select("*")
    .eq("license_key", licenseKey)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    reactions: (data || []).map(rowToSupportReaction),
  });
}
