import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { cheatsheetManifest } from "@/data/s2/uas/bm/opsmgmt-cheatsheet-full";

/**
 * GET /api/cheatsheet/[subject]/[version]/[page]
 *
 * Streams a single protected cheat-sheet page IMAGE (WebP) to a logged-in,
 * non-preview user. View-only — no download disposition.
 *
 * COST: zero Supabase (auth = cookie read only, no DB), minimal Vercel (a small
 * file stream is I/O, not Active CPU; `private, immutable` cache makes repeat
 * views hit the browser cache, not this function). The WebP files live OUTSIDE
 * public/ (no open URL) and are bundled via next.config `outputFileTracingIncludes`.
 *
 * The (subject, version, page) triple is validated against `cheatsheetManifest`
 * server-side — the URL is never trusted to point at an arbitrary file.
 */
export async function GET(
  req: Request,
  {
    params,
  }: { params: Promise<{ subject: string; version: string; page: string }> }
) {
  try {
    // Gate 1 — must be a real logged-in session (not logged-out, not preview).
    // Preview sets hs-session to the literal "PREVIEW"; this content is paid.
    const jar = await cookies();
    const sess = jar.get("hs-session")?.value;
    if (!sess || sess === "PREVIEW") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Gate 2 — valid scope cookie (also rejects scope mismatch). Cookie-only.
    await requireScope(req);

    const { subject, version, page } = await params;

    // Validate against the server manifest — never trust the URL path.
    const sheet = cheatsheetManifest[subject];
    const ver = sheet?.versions.find((v) => v.id === version);
    if (!sheet || !ver) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const n = Number(page);
    if (!Number.isInteger(n) || n < 1 || n > ver.pageCount) {
      return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    }

    // padStart(2) matches the on-disk filenames (01.webp … 11.webp). subject and
    // version are whitelisted above, so no path-traversal is possible here.
    const file = path.join(
      process.cwd(),
      "src/content/cheatsheets",
      subject,
      version,
      `${String(n).padStart(2, "0")}.webp`
    );

    const bytes = await readFile(file);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        // Private (per-user) + long-lived: the browser caches it, so paging
        // back/forth and re-opening the tab cost zero extra invocations.
        "Cache-Control": "private, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Cheatsheet route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
