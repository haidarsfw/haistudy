import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeEq, ScopeError } from "@/lib/auth/scope-check";
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
    name: k?.name ?? "Pengguna",
    avatarUrl: p?.avatar_url ?? null,
    bio: p?.bio ?? null,
    customStatus: p?.custom_status ?? null,
    customStatusEmoji: p?.custom_status_emoji ?? null,
    selectedClass: p?.selected_class ?? null,
    packageTier: k?.package_tier ?? null,
    isAdmin: k?.is_admin ?? false,
  };
}

async function fetchProfiles(
  scope: Awaited<ReturnType<typeof requireScope>>,
  licenseKeys: string[]
): Promise<PublicProfile[]> {
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

  // license_keys is the scope-bound table; only return keys that belong to the
  // caller's scope. This is the cross-scope leak guard for the directory.
  const { data: keyRows, error: keyErr } = await scopeEq(scope)(
    supabase
      .from("license_keys")
      .select("key, name, package_tier, is_admin")
      .in("key", keys)
  );
  if (keyErr) throw keyErr;

  const keyMap = new Map<string, KeyRow>(
    ((keyRows as KeyRow[]) ?? []).map((r) => [r.key, r])
  );
  const allowed = [...keyMap.keys()];
  if (allowed.length === 0) return [];

  const { data: profRows, error: profErr } = await supabase
    .from("user_profiles")
    .select("license_key, avatar_url, bio, custom_status, custom_status_emoji, selected_class")
    .in("license_key", allowed);
  if (profErr) throw profErr;

  const profMap = new Map<string, ProfileRow>(
    ((profRows as ProfileRow[]) ?? []).map((r) => [r.license_key, r])
  );

  return allowed.map((k) => build(k, profMap, keyMap));
}

// ─── GET /api/profile/public?licenseKey=xxx ─── single profile
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get("licenseKey");

    if (!licenseKey) {
      return NextResponse.json(
        { error: "licenseKey is required" },
        { status: 400 }
      );
    }

    const [profile] = await fetchProfiles(scope, [licenseKey]);
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
    const scope = await requireScope(request);
    const body = await request.json().catch(() => ({}));
    const licenseKeys = Array.isArray(body?.licenseKeys) ? body.licenseKeys : [];

    const profiles = await fetchProfiles(scope, licenseKeys as string[]);
    return NextResponse.json({ profiles });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Public profile POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
