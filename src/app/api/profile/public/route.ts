import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
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
  semester: number | null;
  exam_period: string | null;
  jurusan: string | null;
};

function build(
  key: string,
  profiles: Map<string, ProfileRow>,
  keys: Map<string, KeyRow>,
  inScope: boolean
): PublicProfile {
  const p = profiles.get(key);
  const k = keys.get(key);
  return {
    licenseKey: key,
    // Identity (name, photo, tier, admin badge) is GLOBAL by license_key - the
    // same person renders consistently in every scope. Bio/status/class are
    // scope-private and degrade to null when the viewer is in another scope.
    name: k?.name ?? "Pengguna",
    avatarUrl: p?.avatar_url ?? null,
    bio: inScope ? p?.bio ?? null : null,
    customStatus: inScope ? p?.custom_status ?? null : null,
    customStatusEmoji: inScope ? p?.custom_status_emoji ?? null : null,
    selectedClass: inScope ? p?.selected_class ?? null : null,
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

  // Resolve identity GLOBALLY by license_key (no scope filter) - name/photo/tier
  // are the same person everywhere. The scope columns let us flag which keys
  // belong to the caller's scope so the scope-private fields can be gated.
  const { data: keyRows, error: keyErr } = await supabase
    .from("license_keys")
    .select("key, name, package_tier, is_admin, semester, exam_period, jurusan")
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

  // A key is "in scope" when its (semester, exam_period, jurusan) matches the
  // requester's scope. Only then are bio/status/class returned.
  const inScopeKeys = new Set(
    known.filter((k) => {
      const r = keyMap.get(k);
      return (
        !!r &&
        r.semester === scope.semester &&
        r.exam_period === scope.examPeriod &&
        r.jurusan === scope.jurusan
      );
    })
  );

  return known.map((k) => build(k, profMap, keyMap, inScopeKeys.has(k)));
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
