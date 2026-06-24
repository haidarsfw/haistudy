import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { cheatsheetManifest } from "@/data/s2/uas/bm/opsmgmt-cheatsheet-full";
import { getDownloadUnlocked, CHEATSHEET_PASSWORD } from "@/lib/cheatsheet/access";

/**
 * GET /api/cheatsheet/[subject]/access
 *
 * Returns whether the protected download is unlocked for this scope, and (only
 * when unlocked) the PDF password to show the logged-in user. One tiny flag
 * SELECT, short private cache → cheap; not realtime (no loop risk).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ subject: string }> }
) {
  try {
    const jar = await cookies();
    const sess = jar.get("hs-session")?.value;
    if (!sess || sess === "PREVIEW") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const scope = await requireScope(req);
    const { subject } = await params;
    if (!cheatsheetManifest[subject]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ downloadUnlocked: false, password: null });
    }
    const supabase = createServerClient()!;
    const unlocked = await getDownloadUnlocked(supabase, scope, subject);
    return NextResponse.json(
      { downloadUnlocked: unlocked, password: unlocked ? CHEATSHEET_PASSWORD : null },
      { headers: { "Cache-Control": "private, max-age=30" } }
    );
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Cheatsheet access error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
