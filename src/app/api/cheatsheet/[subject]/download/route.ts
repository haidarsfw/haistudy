import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { cheatsheetManifest } from "@/data/s2/uas/bm/opsmgmt-cheatsheet-full";
import { getDownloadUnlocked } from "@/lib/cheatsheet/access";

/**
 * GET /api/cheatsheet/[subject]/download?v=<version>
 *
 * Streams the password-locked, watermarked PDF — only to a logged-in,
 * non-preview user AND only when the admin has unlocked downloads. The file is
 * pre-encrypted offline (static), so this is a plain gated file stream (no PDF
 * processing at runtime). Each download is logged (console.warn survives the
 * prod console strip) for a basic audit trail.
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
    const sheet = cheatsheetManifest[subject];
    if (!sheet) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const v = new URL(req.url).searchParams.get("v") || "";
    const ver = sheet.versions.find((x) => x.id === v);
    if (!ver) {
      return NextResponse.json({ error: "Invalid version" }, { status: 400 });
    }
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Locked" }, { status: 403 });
    }
    const supabase = createServerClient()!;
    if (!(await getDownloadUnlocked(supabase, scope, subject))) {
      return NextResponse.json({ error: "Locked" }, { status: 403 });
    }

    const file = path.join(
      process.cwd(),
      "src/content/cheatsheets",
      subject,
      "downloads",
      `${ver.id}.pdf`
    );
    const bytes = await readFile(file);

    // Audit (no full key): who/what/when. console.warn is kept in prod logs.
    console.warn(
      `[cheatsheet-download] subject=${subject} v=${ver.id} key=${sess.slice(0, 6)} scope=${scope.semester}-${scope.examPeriod}-${scope.jurusan}`
    );

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="OpsMgmt-Cheatsheet-${ver.id}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Cheatsheet download error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
