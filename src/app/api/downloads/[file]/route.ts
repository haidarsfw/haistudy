import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Whitelist of allowed download filenames.
 * Only these files can be served — anything else returns 404.
 */
const ALLOWED_FILES = new Set([
  "uts_akuntansi_final.html",
  "uas_akuntansi_final.html",
]);

/**
 * GET /api/downloads/[file]
 *
 * Serves gated HTML study-material files to authenticated users only.
 * Auth check is cookie-only (no Supabase query) → zero DB cost.
 *
 * Unauthenticated → 302 redirect to /unavailable
 * Preview session → 302 redirect to /unavailable?reason=preview
 * Unknown file    → 404
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  // 1. Auth check: hs-session cookie must exist and not be PREVIEW
  const jar = await cookies();
  const session = jar.get("hs-session")?.value;
  if (!session || session === "PREVIEW") {
    // Preview users ARE signed in, they just lack access — telling them to "log
    // in" reads as a bug. Pass the reason so /unavailable can pitch the packages
    // instead.
    const url = new URL("/unavailable", _req.url);
    if (session === "PREVIEW") url.searchParams.set("reason", "preview");
    return NextResponse.redirect(url, 302);
  }

  // 2. Validate filename against whitelist
  const { file } = await params;
  if (!ALLOWED_FILES.has(file)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 3. Read file from src/content/downloads/ (outside public/)
  try {
    const filePath = join(process.cwd(), "src", "content", "downloads", file);
    const content = await readFile(filePath, "utf-8");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Cache in browser only (not CDN), revalidate after 1 hour
        "Cache-Control": "private, max-age=3600",
        // Prevent embedding in iframes on other sites
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
