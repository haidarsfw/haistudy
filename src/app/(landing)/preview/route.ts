import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_SCOPE, scopeKey } from "@/lib/scope";

/**
 * Preview mode entry point — Route Handler.
 *
 * Next 16 disallows cookies().set() inside Server Components / Pages.
 * A GET route handler is the canonical place to mutate cookies + redirect,
 * giving us the same UX (single round-trip, no client JS bootstrap) that
 * the previous page.tsx tried to do.
 */
export async function GET() {
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
