import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEFAULT_SCOPE, scopeKey } from "@/lib/scope";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 3600,
};

export async function POST() {
  // Never overwrite a real session with PREVIEW. A logged-in user landing here
  // (stale link, double-tap) keeps their session; we just echo their scope.
  const existing = (await cookies()).get("hs-session")?.value;
  if (existing && existing !== "PREVIEW") {
    const sc = (await cookies()).get("hs-scope")?.value;
    return NextResponse.json({
      ok: true,
      alreadyAuthenticated: true,
      scopeKey: sc || scopeKey(DEFAULT_SCOPE),
    });
  }

  const res = NextResponse.json({
    ok: true,
    scopeKey: scopeKey(DEFAULT_SCOPE),
  });
  res.cookies.set("hs-session", "PREVIEW", COOKIE_OPTS);
  res.cookies.set("hs-scope", scopeKey(DEFAULT_SCOPE), COOKIE_OPTS);
  return res;
}
