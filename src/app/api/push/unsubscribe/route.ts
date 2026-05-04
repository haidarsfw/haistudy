import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("hs-session");
    const licenseKey = sessionCookie?.value;
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { endpoint } = (await req.json()) as { endpoint?: string };
    if (!endpoint) {
      return NextResponse.json(
        { error: "Missing endpoint" },
        { status: 400 }
      );
    }
    if (!isSupabaseServerConfigured) return NextResponse.json({ skipped: true });
    const supabase = createServerClient()!;
    const { error } = await supabase
      .from("push_subscriptions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("license_key", licenseKey)
      .eq("endpoint", endpoint);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
