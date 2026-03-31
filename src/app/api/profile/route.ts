import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

// ─── Mock store ───
const mockProfiles = new Map<string, { email: string | null; phone: string | null; selectedClass?: string }>();

// ─── GET /api/profile?licenseKey=xxx ───
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get("licenseKey");

    if (!licenseKey) {
      return NextResponse.json(
        { error: "licenseKey is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      const stored = mockProfiles.get(licenseKey);
      return NextResponse.json({
        profile: stored || { email: null, phone: null },
      });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("user_profiles")
      .select("email, phone")
      .eq("license_key", licenseKey)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return NextResponse.json({
      profile: data || { email: null, phone: null },
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PUT /api/profile - Save profile ───
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { licenseKey, email, phone, selectedClass } = body as {
      licenseKey: string;
      email?: string | null;
      phone?: string | null;
      selectedClass?: string;
    };

    if (!licenseKey) {
      return NextResponse.json(
        { error: "licenseKey is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      const existing = mockProfiles.get(licenseKey) || { email: null, phone: null };
      mockProfiles.set(licenseKey, {
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        selectedClass: selectedClass ?? existing.selectedClass,
      });
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;

    const upsertData: Record<string, unknown> = {
      license_key: licenseKey,
      updated_at: new Date().toISOString(),
    };
    if (email !== undefined) upsertData.email = email;
    if (phone !== undefined) upsertData.phone = phone;
    if (selectedClass !== undefined) upsertData.selected_class = selectedClass;

    const { error } = await supabase
      .from("user_profiles")
      .upsert(upsertData, { onConflict: "license_key" });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
