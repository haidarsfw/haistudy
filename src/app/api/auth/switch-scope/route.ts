import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import { parseScopeKey, isAvailableScope, scopeKey, scopePath } from "@/lib/scope";

/**
 * POST /api/auth/switch-scope
 * Admin-only: switches the hs-scope cookie to a different scope.
 * Body: { scopeKey: "s2-uas-bm" }
 */
export async function POST(request: Request) {
  try {
    const isAdmin = await isAdminFromCookies();
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

    // Update the scope cookie
    jar.set("hs-scope", scopeKey(newScope), {
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
