import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getCookieScope, scopeColumns } from "@/lib/auth/scope-check";

// scope-exempt: client error reports can fire on pre-login pages (landing,
// login) where no hs-scope cookie exists yet — so this route uses a SOFT scope
// read (getCookieScope in try/catch) instead of a hard requireScope, tagging
// the reporter's scope when present and falling back to the column default
// otherwise. A throwing guard here would silently drop pre-login errors.

function sanitizeContext(context: unknown): Record<string, unknown> | null {
  if (!context) return null;
  const str = typeof context === "string" ? context : JSON.stringify(context);
  if (str.length <= 2000) return typeof context === "string" ? { raw: context } : context as Record<string, unknown>;
  return { truncated: str.slice(0, 2000) };
}

// ─── Mock store ───
const mockErrors: Array<{
  id: string;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  userAgent: string | null;
  resolved: boolean;
  createdAt: string;
}> = [];

// ─── POST /api/errors ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, stack, context, userAgent } = body as {
      message: string;
      stack: string | null;
      context: Record<string, unknown> | null;
      userAgent: string | null;
    };

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      mockErrors.push({
        id: `err-${Date.now()}`,
        message,
        stack: stack || null,
        context: context || null,
        userAgent: userAgent || null,
        resolved: false,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    // Soft scope: tag the reporter's cohort when the cookie is present.
    let scopeCols: Record<string, unknown> = {};
    try {
      scopeCols = scopeColumns(await getCookieScope());
    } catch {
      // no hs-scope cookie (pre-login) — let the DB default stand
    }
    const { error } = await supabase.from("error_logs").insert({
      message: (message || "").slice(0, 500),
      stack: (stack || "").slice(0, 5000),
      context: sanitizeContext(context),
      user_agent: (userAgent || "").slice(0, 500),
      resolved: false,
      ...scopeCols,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error log POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
