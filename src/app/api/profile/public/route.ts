import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { displayName } from "@/lib/name";
import type { PublicProfile } from "@/types";

type ProfileRow = {
  license_key: string;
  avatar_url: string | null;
  bio: string | null;
  custom_status: string | null;
  custom_status_emoji: string | null;
  selected_class: string | null;
};

type KeyRow = {
  key: string;
  name: string | null;
  short_name: string | null;
  package_tier: PublicProfile["packageTier"];
  is_admin: boolean | null;
};

function build(
  key: string,
  profiles: Map<string, ProfileRow>,
  keys: Map<string, KeyRow>
): PublicProfile {
  const p = profiles.get(key);
  const k = keys.get(key);
  return {
    licenseKey: key,
    // Every profile field (photo, tier, admin badge, bio, status, class) is
    // GLOBAL by license_key. user_profiles has no scope columns, so the same
    // person renders identically in every scope. requireScope still guards the
    // route for auth; it does not narrow which fields are returned. This is what
    // lets all users (including admins viewing another scope) see avatar/status/bio.
    // NICKNAME ONLY — never expose the full legal name to other users. Falls back
    // to firstWord(name) for the 140 legacy keys with no short_name.
    name: displayName({ shortName: k?.short_name, name: k?.name }),
    avatarUrl: p?.avatar_url ?? null,
    bio: p?.bio ?? null,
    customStatus: p?.custom_status ?? null,
    customStatusEmoji: p?.custom_status_emoji ?? null,
    selectedClass: p?.selected_class ?? null,
    packageTier: k?.package_tier ?? null,
    isAdmin: k?.is_admin ?? false,
  };
}

async function fetchProfiles(licenseKeys: string[]): Promise<PublicProfile[]> {
  const keys = [...new Set(licenseKeys.map((k) => k.toUpperCase()))]
    .filter(Boolean)
    .slice(0, 200);
  if (keys.length === 0) return [];

  if (!isSupabaseServerConfigured) {
    return keys.map((k) => ({
      licenseKey: k,
      name: "Pengguna",
      avatarUrl: null,
      bio: null,
      customStatus: null,
      customStatusEmoji: null,
      selectedClass: null,
      packageTier: null,
      isAdmin: false,
    }));
  }

  const supabase = createServerClient()!;

  // Resolve identity GLOBALLY by license_key (no scope filter). name/photo/tier
  // are the same person everywhere; there are no scope-private fields to gate.
  const { data: keyRows, error: keyErr } = await supabase
    .from("license_keys")
    .select("key, name, short_name, package_tier, is_admin")
    .in("key", keys);
  if (keyErr) throw keyErr;

  const keyMap = new Map<string, KeyRow>(
    ((keyRows as KeyRow[]) ?? []).map((r) => [r.key, r])
  );
  const known = [...keyMap.keys()];
  if (known.length === 0) return [];

  const { data: profRows, error: profErr } = await supabase
    .from("user_profiles")
    .select("license_key, avatar_url, bio, custom_status, custom_status_emoji, selected_class")
    .in("license_key", known);
  if (profErr) throw profErr;

  const profMap = new Map<string, ProfileRow>(
    ((profRows as ProfileRow[]) ?? []).map((r) => [r.license_key, r])
  );

  return known.map((k) => build(k, profMap, keyMap));
}

// ─── GET /api/profile/public?licenseKey=xxx ─── single profile
export async function GET(request: Request) {
  try {
    await requireScope(request);
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get("licenseKey");

    if (!licenseKey) {
      return NextResponse.json(
        { error: "licenseKey is required" },
        { status: 400 }
      );
    }

    const [profile] = await fetchProfiles([licenseKey]);
    return NextResponse.json({ profile: profile ?? null });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Public profile GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/profile/public ─── batch for the offline directory
export async function POST(request: Request) {
  try {
    await requireScope(request);
    const body = await request.json().catch(() => ({}));
    const licenseKeys = Array.isArray(body?.licenseKeys) ? body.licenseKeys : [];

    const profiles = await fetchProfiles(licenseKeys as string[]);
    return NextResponse.json({ profiles });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Public profile POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
