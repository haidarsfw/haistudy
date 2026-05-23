import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_SCOPE, scopeKey } from "@/lib/scope";

/**
 * Preview mode entry point — server component.
 *
 * Sets httpOnly cookies directly via next/headers and issues an HTTP
 * redirect to the scoped dashboard. No client JS bootstrap, no client-side
 * router.push hop — eliminates the multi-second LCP delay the previous
 * client implementation caused on slow mobile networks.
 *
 * SessionProvider on the dashboard side reads the cookie via /api/auth/me
 * (which now recognizes hs-session="PREVIEW" — see the route file).
 */
export default async function PreviewPage() {
  const jar = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 3600,
  };
  jar.set("hs-session", "PREVIEW", cookieOpts);
  jar.set("hs-scope", scopeKey(DEFAULT_SCOPE), cookieOpts);
  redirect(`/${scopeKey(DEFAULT_SCOPE).replace(/-/g, "/")}/dashboard`);
}
