import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * GET /api/version
 *
 * Returns the current build timestamp. This value is set at build time
 * via the NEXT_PUBLIC_BUILD_ID env var (injected by next.config).
 * When it changes between requests, the client knows a new deploy happened.
 */
export async function GET() {
  return NextResponse.json({
    buildId: process.env.NEXT_PUBLIC_BUILD_ID || "dev",
  });
}
