import { NextResponse } from "next/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { createServerClient } from "@/lib/supabase/server";
import { cheatsheetManifest } from "@/data/s2/uas/bm/opsmgmt-cheatsheet-full";
import { setDownloadUnlocked } from "@/lib/cheatsheet/access";

/**
 * POST /api/cheatsheet/[subject]/lock   body: { enabled: boolean }
 *
 * Admin-only. Flips the download lock for this subject in the caller's scope
 * (upsert into scope_feature_flags — creates the row on first toggle, so no
 * migration is needed). One write, only when an admin flips it.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ subject: string }> }
) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const scope = await requireScope(req);
    const { subject } = await params;
    if (!cheatsheetManifest[subject]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = (await req.json().catch(() => ({}))) as { enabled?: unknown };
    const enabled = Boolean(body?.enabled);

    const supabase = createServerClient()!;
    await setDownloadUnlocked(supabase, scope, subject, enabled);
    return NextResponse.json({ ok: true, enabled });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Cheatsheet lock error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
