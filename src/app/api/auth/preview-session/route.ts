import { NextResponse } from "next/server";
import { DEFAULT_SCOPE, scopeKey } from "@/lib/scope";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 3600,
};

export async function POST() {
  const res = NextResponse.json({
    ok: true,
    scopeKey: scopeKey(DEFAULT_SCOPE),
  });
  res.cookies.set("hs-session", "PREVIEW", COOKIE_OPTS);
  res.cookies.set("hs-scope", scopeKey(DEFAULT_SCOPE), COOKIE_OPTS);
  return res;
}
