import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";

// ─── GET /api/admin/ai-conversations?licenseKey=xxx ───
export async function GET(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get("licenseKey");

    if (!licenseKey) {
      return NextResponse.json(
        { error: "licenseKey is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ conversations: [] });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("id, license_key, title, messages, created_at, updated_at")
      .eq("license_key", licenseKey)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Admin AI conversations fetch error:", error);
      return NextResponse.json({ conversations: [] });
    }

    return NextResponse.json({ conversations: data || [] });
  } catch (error) {
    console.error("Admin AI conversations error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
