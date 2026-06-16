import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { parseScopeKey } from "@/lib/scope";

// ─── Realtime JWT minting ───
// License-key auth has no Supabase Auth session, so the browser is the `anon`
// role on the realtime socket. To let RLS identify the user (migration 044),
// we mint a short-lived Supabase-compatible JWT (HS256, signed with the project
// JWT secret) carrying license_key + scope + is_admin claims. The browser
// supabase client uses this as its `accessToken` (see lib/supabase/client.ts).
//
// Reads the existing httpOnly cookies (set by /api/auth/validate), so existing
// sessions get a token with no re-login. Preview/logged-out → 401 (no realtime).

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";
const TTL_SECONDS = 60 * 60; // 1 hour

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function signHs256(payload: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export async function GET() {
  if (!JWT_SECRET) {
    // Realtime auth not configured — client falls back to anon (no live updates
    // once 044 is applied). Keeps the app from hard-failing if the env is unset.
    return NextResponse.json({ error: "realtime-auth-unconfigured" }, { status: 503 });
  }

  const jar = await cookies();
  const session = (jar.get("hs-session")?.value ?? "").toUpperCase();
  if (!session || session === "PREVIEW" || session === "PREVIEW01") {
    return NextResponse.json({ error: "no-session" }, { status: 401 });
  }

  const scope = parseScopeKey(jar.get("hs-scope")?.value ?? "");
  if (!scope) {
    return NextResponse.json({ error: "no-scope" }, { status: 401 });
  }

  const isAdmin = jar.get("hs-admin")?.value === "1";
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TTL_SECONDS;

  const token = signHs256({
    role: "authenticated",
    aud: "authenticated",
    sub: session,
    license_key: session,
    semester: scope.semester,
    exam_period: scope.examPeriod,
    jurusan: scope.jurusan,
    is_admin: isAdmin,
    iat: now,
    exp,
  });

  return NextResponse.json(
    { token, expiresAt: exp * 1000 },
    { headers: { "Cache-Control": "no-store" } }
  );
}
