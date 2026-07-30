import { NextResponse } from "next/server";

export const dynamic = "force-static";

// scope-exempt: returns two build constants and touches no database and no
// request. It is force-static, so a scope read would not even be available here.

/**
 * GET /api/version
 *
 * Returns the current build timestamp. This value is set at build time
 * via the NEXT_PUBLIC_BUILD_ID env var (injected by next.config).
 * When it changes between requests, the client knows a new deploy happened.
 *
 * `ref` is the commit the build came from. The timestamp answers "is this a
 * different build"; only the ref answers "which change am I looking at", which
 * is the question that matters when a bug has to be attributed to one stage of
 * a staged migration rather than to the pile it was built on.
 */
export async function GET() {
  return NextResponse.json({
    buildId: process.env.NEXT_PUBLIC_BUILD_ID || "dev",
    ref: process.env.NEXT_PUBLIC_BUILD_REF || "unknown",
  });
}
