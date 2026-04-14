import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

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
    const { error } = await supabase.from("error_logs").insert({
      message: (message || "").slice(0, 500),
      stack: (stack || "").slice(0, 5000),
      context: sanitizeContext(context),
      user_agent: (userAgent || "").slice(0, 500),
      resolved: false,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error log POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
