import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getCaller } from "@/lib/auth/session-license";

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
    // Require an authenticated session. This endpoint writes to activity_logs
    // (read by the admin dashboard); without a guard anyone could inject rows.
    // The only client caller (logActivity) always runs after login.
    const caller = await getCaller();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const rawAction =
      body && typeof body.action === "string" ? body.action.trim() : "";
    if (!rawAction) {
      return NextResponse.json(
        { error: "action is required" },
        { status: 400 }
      );
    }

    // Bound the free-form fields so a crafted request can't bloat the table.
    const action = rawAction.slice(0, 64);
    const details =
      body && typeof body.details === "string"
        ? body.details.slice(0, 500)
        : "";
    const n = Number(body?.count);
    const count = Number.isFinite(n)
      ? Math.min(1000, Math.max(1, Math.floor(n)))
      : 1;

    const userName = "User";

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
