import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

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
      message,
      stack: stack || null,
      context: context || null,
      user_agent: userAgent || null,
      resolved: false,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error log POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
