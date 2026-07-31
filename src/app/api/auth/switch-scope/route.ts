import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminFromSession } from "@/lib/auth/admin-guard";
import { parseScopeKey, isAvailableScope, scopeKey, scopePath } from "@/lib/scope";
import { signScopeValue } from "@/lib/auth/scope-cookie";

/**
 * POST /api/auth/switch-scope
 * Admin-only: switches the hs-scope cookie to a different scope.
 * Body: { scopeKey: "s2-uas-bm" }
 *
 * scope-exempt: this route WRITES the scope cookie, so requiring the current
 * one would be circular. The guard here is isAdminFromSession, which reads
 * is_admin from the database rather than from the forgeable hs-admin hint.
 */
export async function POST(request: Request) {
  try {
    const isAdmin = await isAdminFromSession();
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { scopeKey: newScopeKey } = body as { scopeKey: string };

    if (!newScopeKey) {
      return NextResponse.json({ error: "scopeKey required" }, { status: 400 });
    }

    const newScope = parseScopeKey(newScopeKey);
    if (!newScope || !isAvailableScope(newScope)) {
      return NextResponse.json({ error: "Invalid or unavailable scope" }, { status: 400 });
    }

    const jar = await cookies();

    // Update the scope cookie. Stamped against the session that asked, so the
    // value cannot be lifted into another session or edited afterwards. This
    // route is admin-only, which is what makes issuing a stamp for a period the
    // caller did not buy correct here and nowhere else.
    jar.set("hs-scope", signScopeValue(scopeKey(newScope), jar.get("hs-session")?.value ?? ""), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      scope: newScope,
      scopeKey: scopeKey(newScope),
      scopePath: scopePath(newScope),
      redirectTo: `/${scopePath(newScope)}/dashboard`,
    });
  } catch (error) {
    console.error("Switch scope error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
