import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import {
  scopeKey as toScopeKey,
  DEFAULT_SCOPE,
  LATEST_SCOPE,
  validateScopeTuple,
} from "@/lib/scope";
import type { ScopeTuple, ExamPeriod } from "@/types/scope";

/**
 * GET /api/auth/me
 * Returns the client-shaped session payload from the hs-session cookie.
 * Used by SessionProvider to hydrate localStorage after an OAuth callback
 * (callback only sets httpOnly cookies — client state was empty).
 */
export async function GET() {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get("hs-session")?.value;
  if (!licenseKey) {
    return NextResponse.json({ session: null }, { status: 401 });
  }

  // Preview entry — no-login flow sets hs-session="PREVIEW". Return a
  // preview-shaped session without hitting the DB. PREVIEW01 (test license)
  // still flows through the mock/Supabase paths below.
  if (licenseKey === "PREVIEW") {
    return NextResponse.json({
      session: {
        licenseKey: "PREVIEW",
        name: "Preview User",
        isAdmin: false,
        isTester: false,
        expiry: null,
        selectedClass: "LE86",
        isPreview: true,
        packageTier: "normal" as const,
        scope: DEFAULT_SCOPE,
        scopeKey: toScopeKey(DEFAULT_SCOPE),
      },
    });
  }

  // Mock mode — accept ADMIN1 / PREVIEW01 / pattern keys without DB lookup
  if (!isSupabaseServerConfigured) {
    const mockKeys: Record<
      string,
      { name: string; isAdmin: boolean; isTester: boolean }
    > = {
      ADMIN1: { name: "Admin", isAdmin: true, isTester: false },
      PREVIEW01: { name: "Preview User", isAdmin: false, isTester: true },
    };
    const match = mockKeys[licenseKey];
    return NextResponse.json({
      session: {
        licenseKey,
        name: match?.name || `User ${licenseKey.slice(-4)}`,
        isAdmin: match?.isAdmin || false,
        isTester: match?.isTester || false,
        expiry: null,
        selectedClass: "",
        isPreview: licenseKey === "PREVIEW01",
        packageTier: licenseKey === "ADMIN1" ? "vip" : "normal",
        scope: DEFAULT_SCOPE,
        scopeKey: toScopeKey(DEFAULT_SCOPE),
      },
    });
  }

  const supabase = createServerClient()!;
  const { data: license } = await supabase
    .from("license_keys")
    .select("*")
    .eq("key", licenseKey)
    .single();

  if (!license) {
    return NextResponse.json({ session: null }, { status: 401 });
  }

  const { data: activation } = await supabase
    .from("activations")
    .select("*")
    .eq("license_key", licenseKey)
    .single();

  // Settings (for embedded payload, matches /validate shape)
  const { data: settingsData } = await supabase
    .from("user_settings")
    .select("*")
    .eq("license_key", licenseKey)
    .single();

  const scopeTuple: ScopeTuple = {
    semester:
      typeof license.semester === "number" ? license.semester : DEFAULT_SCOPE.semester,
    examPeriod: (license.exam_period as ExamPeriod) || DEFAULT_SCOPE.examPeriod,
    jurusan:
      typeof license.jurusan === "string" ? license.jurusan : DEFAULT_SCOPE.jurusan,
  };
  const licenseScope = validateScopeTuple(scopeTuple) ? scopeTuple : DEFAULT_SCOPE;
  const effectiveScope: ScopeTuple = license.is_admin ? LATEST_SCOPE : licenseScope;

  const session = {
    licenseKey,
    name: activation?.user_name || license.name,
    isAdmin: license.is_admin,
    isTester: license.is_tester,
    expiry: activation?.expiry ?? null,
    selectedClass: settingsData?.selected_class ?? "",
    isPreview: license.is_preview || false,
    packageTier:
      (license.package_tier as "share" | "normal" | "vip" | "diamond") || "normal",
    scope: effectiveScope,
    scopeKey: toScopeKey(effectiveScope),
  };

  const settings = settingsData
    ? {
        darkMode: settingsData.dark_mode ?? true,
        theme: settingsData.theme ?? "forest",
        font: settingsData.font ?? "jakarta",
        language: settingsData.language ?? "id",
        selectedClass: settingsData.selected_class ?? "",
        darkModeSchedule: settingsData.dark_mode_schedule ?? null,
      }
    : null;

  return NextResponse.json({ session, settings });
}
