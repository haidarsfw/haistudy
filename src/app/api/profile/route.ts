import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getCaller } from "@/lib/auth/session-license";
import type { UserProfile } from "@/types";

// ─── Mock store ───
type MockProfile = UserProfile & { selectedClass?: string };
const mockProfiles = new Map<string, MockProfile>();

const EMPTY: UserProfile = {
  email: null,
  phone: null,
  avatarUrl: null,
  bio: null,
  customStatus: null,
  customStatusEmoji: null,
};

function mapRow(data: Record<string, unknown>): UserProfile {
  return {
    email: (data.email as string) ?? null,
    phone: (data.phone as string) ?? null,
    avatarUrl: (data.avatar_url as string) ?? null,
    bio: (data.bio as string) ?? null,
    customStatus: (data.custom_status as string) ?? null,
    customStatusEmoji: (data.custom_status_emoji as string) ?? null,
  };
}

// ─── GET /api/profile?licenseKey=xxx ───
export async function GET() {
  try {
    // Identity from the hs-session cookie, NOT a client-supplied param (IDOR fix).
    const caller = await getCaller();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const licenseKey = caller.licenseKey;

    if (!isSupabaseServerConfigured) {
      const stored = mockProfiles.get(licenseKey);
      return NextResponse.json({ profile: stored ?? EMPTY });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("user_profiles")
      .select("email, phone, avatar_url, bio, custom_status, custom_status_emoji")
      .eq("license_key", licenseKey)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return NextResponse.json({ profile: data ? mapRow(data) : EMPTY });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PUT /api/profile - Save profile (partial upsert) ───
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      phone,
      selectedClass,
      avatarUrl,
      bio,
      customStatus,
      customStatusEmoji,
    } = body as {
      email?: string | null;
      phone?: string | null;
      selectedClass?: string;
      avatarUrl?: string | null;
      bio?: string | null;
      customStatus?: string | null;
      customStatusEmoji?: string | null;
    };

    // Identity from the hs-session cookie, NOT a client-supplied param (IDOR fix).
    const caller = await getCaller();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const licenseKey = caller.licenseKey;

    // Shape validation - accept null/empty (clears the field) but reject garbage.
    // Length limits mirror the DB CHECK constraints (bio<=200, status<=80, emoji<=8).
    if (email !== undefined && email !== null && email !== "") {
      if (
        typeof email !== "string" ||
        email.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      }
    }
    if (phone !== undefined && phone !== null && phone !== "") {
      if (typeof phone !== "string" || phone.length > 30) {
        return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
      }
    }
    if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== "") {
      if (
        typeof avatarUrl !== "string" ||
        avatarUrl.length > 600 ||
        !/^https:\/\//.test(avatarUrl)
      ) {
        return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
      }
    }
    if (bio !== undefined && bio !== null) {
      if (typeof bio !== "string" || bio.length > 200) {
        return NextResponse.json({ error: "Bio too long" }, { status: 400 });
      }
    }
    if (customStatus !== undefined && customStatus !== null) {
      if (typeof customStatus !== "string" || customStatus.length > 80) {
        return NextResponse.json({ error: "Status too long" }, { status: 400 });
      }
    }
    if (customStatusEmoji !== undefined && customStatusEmoji !== null) {
      if (typeof customStatusEmoji !== "string" || customStatusEmoji.length > 8) {
        return NextResponse.json({ error: "Emoji too long" }, { status: 400 });
      }
    }

    if (!isSupabaseServerConfigured) {
      const existing = mockProfiles.get(licenseKey) ?? { ...EMPTY };
      mockProfiles.set(licenseKey, {
        ...existing,
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bio !== undefined && { bio }),
        ...(customStatus !== undefined && { customStatus }),
        ...(customStatusEmoji !== undefined && { customStatusEmoji }),
        ...(selectedClass !== undefined && { selectedClass }),
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
    if (avatarUrl !== undefined) upsertData.avatar_url = avatarUrl || null;
    if (bio !== undefined) upsertData.bio = bio || null;
    if (customStatus !== undefined) upsertData.custom_status = customStatus || null;
    if (customStatusEmoji !== undefined)
      upsertData.custom_status_emoji = customStatusEmoji || null;

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
