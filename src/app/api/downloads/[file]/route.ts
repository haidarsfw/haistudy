import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile } from "fs/promises";
import { join } from "path";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { eqScope } from "@/lib/scope";
import type { ScopeTuple } from "@/types/scope";

/**
 * The downloadable files, each with the scope that paid for it.
 *
 * This doubles as the whitelist — a file not named here does not exist. Keeping
 * the allow-list and the scope map as one structure is deliberate: they were
 * separate concepts before (the list existed, the scope did not), and a file
 * could be added to the list without anyone thinking about who may read it.
 *
 * A Map, not an object literal: `FILE_SCOPE["constructor"]` on a plain object
 * returns a truthy inherited value.
 */
const FILE_SCOPE = new Map<string, ScopeTuple>([
  ["uts_akuntansi_final.html", { semester: 2, examPeriod: "uts", jurusan: "bm" }],
  ["uas_akuntansi_final.html", { semester: 2, examPeriod: "uas", jurusan: "bm" }],
]);

/**
 * GET /api/downloads/[file]
 *
 * Serves gated HTML study material. Cookie-only auth (no Supabase query) → zero
 * DB cost; requireScope reads hs-scope from the cookie jar, so that holds.
 *
 * Unauthenticated  → 302 /unavailable
 * Preview session  → 302 /unavailable?reason=preview
 * Unknown file     → 404
 * Wrong scope      → 404 (deliberately indistinguishable from "no such file":
 *                    a UTS buyer should not learn which UAS files exist)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  // 1. Auth check: hs-session cookie must exist and not be PREVIEW
  const jar = await cookies();
  const session = jar.get("hs-session")?.value;
  if (!session || session === "PREVIEW") {
    // Preview users ARE signed in, they just lack access — telling them to "log
    // in" reads as a bug. Pass the reason so /unavailable can pitch the packages
    // instead.
    const url = new URL("/unavailable", req.url);
    if (session === "PREVIEW") url.searchParams.set("reason", "preview");
    return NextResponse.redirect(url, 302);
  }

  // 2. Validate filename against the whitelist
  const { file } = await params;
  const required = FILE_SCOPE.get(file);
  if (!required) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 3. Scope check. Being signed in was the ONLY gate here, while the whitelist
  //    holds files from two different exam periods — so anyone who had bought
  //    UTS could fetch the UAS final by editing the URL, and vice versa. The
  //    files are linked from per-scope pinned threads, so no legitimate user
  //    ever reaches one outside their own scope.
  let scope: ScopeTuple;
  try {
    scope = await requireScope(req);
  } catch (e) {
    if (e instanceof ScopeError) {
      // Signed in but no usable scope cookie: can't prove entitlement.
      return NextResponse.redirect(new URL("/unavailable", req.url), 302);
    }
    throw e;
  }
  if (!eqScope(scope, required)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 4. Read file from src/content/downloads/ (outside public/)
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
