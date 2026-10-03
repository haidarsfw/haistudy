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
import { firstWord, capitalizeFirst } from "@/lib/name";
import { normalizeLoginMethod } from "@/lib/auth/login-method";
import { readDeviceIdentity } from "@/lib/auth/device-id";
import { hasActiveGroup, isMentorAccount } from "@/lib/mentor/groups";

/**
 * GET /api/auth/me
 * Returns the client-shaped session payload from the hs-session cookie.
 * Used by SessionProvider to hydrate localStorage after an OAuth callback
 * (callback only sets httpOnly cookies - client state was empty).
 */
export async function GET() {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get("hs-session")?.value;
  if (!licenseKey) {
    return NextResponse.json({ session: null }, { status: 401 });
  }

  // Preview entry - no-login flow sets hs-session="PREVIEW". Return a
  // preview-shaped session without hitting the DB. PREVIEW01 (test license)
  // still flows through the mock/Supabase paths below.
  if (licenseKey === "PREVIEW") {
    return NextResponse.json({
      session: {
        licenseKey: "PREVIEW",
        name: "Preview User",
        shortName: "Preview",
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

  // Mock mode - accept ADMIN1 / PREVIEW01 / pattern keys without DB lookup
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
        shortName: capitalizeFirst(firstWord(match?.name) || `User ${licenseKey.slice(-4)}`),
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

  // Started now, read at the end: it runs alongside the reads below instead of
  // adding a round trip to a route every app load waits on.
  const mentorCheck: Promise<boolean> = license.account_id
    ? isMentorAccount(supabase, license.account_id as string).catch(() => false)
    : Promise.resolve(false);
  // A mentor is in a group by definition; only a non-mentor costs the lookup.
  const groupCheck: Promise<boolean> = mentorCheck.then((m) =>
    m || !license.account_id
      ? m
      : hasActiveGroup(supabase, license.account_id as string).catch(() => false)
  );

  // Devices come back embedded rather than as a second round trip: this runs on
  // every app load and the free tier pays for each query.
  const { data: activation } = await supabase
    .from("activations")
    .select("*, devices(device_id)")
    .eq("license_key", licenseKey)
    .single();

  // Is this browser still one of the devices on the licence?
  //
  // Nothing used to ask. "Keluarkan perangkat" deleted the row and freed the
  // slot, and the device carried on using the app; so did "ganti password" and
  // "keluar dari perangkat lain", because the app is gated on hs-session alone
  // and that cookie was never revisited. Three screens promised something none
  // of them delivered.
  //
  // The session cookie is CLEARED rather than merely answering 401: the client
  // ignores a failed /api/auth/me and keeps its stored session, but it cannot
  // ignore the cookie being gone — the proxy bounces the next navigation.
  const registeredDevices = Array.isArray(activation?.devices)
    ? (activation.devices as { device_id: string }[])
    : [];
  if (!license.unlimited_devices && registeredDevices.length > 0) {
    const { id: callerDeviceId } = readDeviceIdentity(cookieStore);
    const stillRegistered =
      Boolean(callerDeviceId) &&
      registeredDevices.some((d) => d.device_id === callerDeviceId);
    if (!stillRegistered) {
      const res = NextResponse.json({ session: null }, { status: 401 });
      const cleared = { path: "/", maxAge: 0 };
      res.cookies.set("hs-session", "", cleared);
      res.cookies.set("hs-scope", "", cleared);
      res.cookies.set("hs-admin", "", cleared);
      return res;
    }
  }

  // Settings (for embedded payload, matches /validate shape)
  const { data: settingsData } = await supabase
    .from("user_settings")
    .select("*")
    .eq("license_key", licenseKey)
    .single();

  // The class is a display label (sidebar, chat, profile), not a gate. It used
  // to be collected by a blocking screen on first entry, which asked for
  // something the buyer had already typed at checkout. That screen is gone, so
  // fall back to the class the account was bought with. One extra read, and
  // only while user_settings has nothing stored.
  let classLabel = (settingsData?.selected_class as string) ?? "";
  if (!classLabel && license.account_id) {
    const { data: acc } = await supabase
      .from("accounts")
      .select("class_code")
      .eq("id", license.account_id)
      .maybeSingle();
    classLabel = (acc?.class_code as string) ?? "";

    // Write it back, once. Without this the branch above is not a fallback at
    // all: the only thing that ever wrote user_settings.selected_class was the
    // class-selection gate, and that gate is gone — so the column stays empty
    // forever and this route, which runs on EVERY app load, would carry a
    // permanent extra read. Fire-and-forget: a slow settings table must not
    // hold up a session check, and the worst case is simply doing it again.
    if (classLabel) {
      void supabase
        .from("user_settings")
        .update({ selected_class: classLabel })
        .eq("license_key", licenseKey)
        .then(
          () => {},
          () => {}
        );
    }
  }

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
    shortName: capitalizeFirst(
      activation?.short_name ||
        license.short_name ||
        firstWord(activation?.user_name || license.name)
    ),
    isAdmin: license.is_admin,
    isTester: license.is_tester,
    // For the mentor perks the client has to know about (the AI chat cap).
    // The server re-checks on every write; this only shapes the screen.
    isMentor: await mentorCheck,
    inGroup: await groupCheck,
    expiry: activation?.expiry ?? null,
    selectedClass: classLabel,
    isPreview: license.is_preview || false,
    packageTier:
      (license.package_tier as "share" | "normal" | "vip" | "diamond") || "normal",
    // Report the real method — this used to collapse 'password' into 'key'.
    loginMethod: normalizeLoginMethod(license.login_method as string | null) ?? "key",
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
