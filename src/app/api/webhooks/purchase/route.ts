import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

// ─── POST /api/webhooks/purchase - Google Form webhook ───
// Expected payload from Google Apps Script:
// { name, whatsapp, email?, package }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, whatsapp, email } = body;
    const pkg = body.package || "normal";

    if (!name || !whatsapp) {
      return NextResponse.json(
        { error: "name and whatsapp are required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      // No-op in dev mode - purchases are seeded in /api/admin/purchase
      return NextResponse.json({
        success: true,
        id: crypto.randomUUID(),
      });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("purchase_requests")
      .insert({
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        email: email?.trim() || null,
        package: pkg,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Purchase webhook error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
