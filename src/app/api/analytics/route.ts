import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

// ─── Mock store ───
const mockLogs: Array<{
  id: string;
  userName: string;
  action: string;
  details: string;
  count: number;
  createdAt: string;
}> = [];

// ─── POST /api/analytics ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, details = "", count = 1 } = body as {
      action: string;
      details: string;
      count: number;
    };

    if (!action) {
      return NextResponse.json(
        { error: "action is required" },
        { status: 400 }
      );
    }

    // Get user name from session cookie context
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("hs-session");
    const userName = sessionCookie ? "User" : "Anonymous";

    if (!isSupabaseServerConfigured) {
      mockLogs.push({
        id: `log-${Date.now()}`,
        userName,
        action,
        details,
        count,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const { error } = await supabase.from("activity_logs").insert({
      user_name: userName,
      action,
      details,
      count,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
