import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope, requireScopedMode } from "@/lib/auth/admin-scope";
import { scopeColumns, ScopeError } from "@/lib/auth/scope-check";
import { isAvailableScope, parseScopeKey } from "@/lib/scope";
import type { LicenseKey, Activation, Device } from "@/types";

function scopeErrorResponse(error: unknown) {
  if (error instanceof ScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Response) return error;
  return null;
}

// ─── Mock store ───
const mockLicenses = new Map<string, LicenseKey & { semester: number; examPeriod: "uts" | "uas"; jurusan: string }>();
const mockActivations = new Map<string, Activation>();
const mockDevices: Device[] = [];

// Seed mock data
if (mockLicenses.size === 0) {
  const now = new Date().toISOString();
  const baseScope = { semester: 2, examPeriod: "uts" as const, jurusan: "bm" };
  mockLicenses.set("PREVIEW01", {
    key: "PREVIEW01",
    name: "Preview",
    daysActive: 0,
    isAdmin: false,
    isTester: true,
    packageTier: "normal",
    maxDevices: 2,
    unlimitedDevices: false,
    fixedExpiry: null,
    suspendedUntil: null,
    totalQuizScore: 0,
    totalOnlineMinutes: 0,
    createdAt: now,
    updatedAt: now,
    ...baseScope,
  });
  mockLicenses.set("ADMIN1", {
    key: "ADMIN1",
    name: "Admin",
    daysActive: 0,
    isAdmin: true,
    isTester: true,
    packageTier: "vip",
    maxDevices: 5,
    unlimitedDevices: true,
    fixedExpiry: null,
    suspendedUntil: null,
    totalQuizScore: 250,
    totalOnlineMinutes: 1200,
    createdAt: now,
    updatedAt: now,
    ...baseScope,
  });
  mockLicenses.set("B29-ABC123", {
    key: "B29-ABC123",
    name: "Budi Santoso",
    daysActive: 0,
    isAdmin: false,
    isTester: false,
    packageTier: "normal",
    maxDevices: 2,
    unlimitedDevices: false,
    fixedExpiry: null,
    suspendedUntil: null,
    totalQuizScore: 320,
    totalOnlineMinutes: 450,
    createdAt: now,
    updatedAt: now,
    ...baseScope,
  });

  mockActivations.set("act-0", {
    id: "act-0",
    licenseKey: "ADMIN1",
    userName: "Admin",
    email: "admin@haistudy.id",
    expiry: null,
    referralCode: null,
    referralCount: 0,
    referredBy: null,
    activatedAt: now,
    updatedAt: now,
  });
  mockActivations.set("act-1", {
    id: "act-1",
    licenseKey: "B29-ABC123",
    userName: "Budi Santoso",
    email: "budi@binus.ac.id",
    expiry: null,
    referralCode: "REF-XYZ123",
    referralCount: 2,
    referredBy: null,
    activatedAt: now,
    updatedAt: now,
  });
  mockDevices.push({
    id: "dev-1",
    activationId: "act-1",
    deviceId: "fp-abc123",
    deviceType: "desktop",
    deviceLabel: "Chrome on Windows",
    isPrimary: true,
    verified: true,
    lastSeen: now,
    createdAt: now,
  });
}

interface LicenseRowWithScope {
  key: string;
  semester: number;
  exam_period: "uts" | "uas";
  jurusan: string;
  [k: string]: unknown;
}

function mapLicenseRow(row: Record<string, unknown>): LicenseKey & { semester: number; examPeriod: "uts" | "uas"; jurusan: string } {
  return {
    key: row.key as string,
    name: row.name as string,
    daysActive: row.days_active as number,
    isAdmin: row.is_admin as boolean,
    isTester: row.is_tester as boolean,
    packageTier: (row.package_tier as "share" | "normal" | "vip" | "diamond") || "normal",
    maxDevices: row.max_devices as number,
    unlimitedDevices: row.unlimited_devices as boolean,
    fixedExpiry: (row.fixed_expiry as string) || null,
    suspendedUntil: (row.suspended_until as string) || null,
    totalQuizScore: (row.total_quiz_score as number) || 0,
    totalOnlineMinutes: (row.total_online_minutes as number) || 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    semester: (row.semester as number) ?? 2,
    examPeriod: ((row.exam_period as "uts" | "uas") ?? "uts"),
    jurusan: ((row.jurusan as string) ?? "bm"),
  };
}

function mapActivationRow(row: Record<string, unknown>): Activation {
  return {
    id: row.id as string,
    licenseKey: row.license_key as string,
    userName: row.user_name as string,
    email: (row.email as string) || null,
    expiry: (row.expiry as string) || null,
    referralCode: (row.referral_code as string) || null,
    referralCount: (row.referral_count as number) || 0,
    referredBy: (row.referred_by as string) || null,
    activatedAt: row.activated_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDeviceRow(row: Record<string, unknown>): Device {
  return {
    id: row.id as string,
    activationId: row.activation_id as string,
    deviceId: row.device_id as string,
    deviceType: row.device_type as "desktop" | "mobile" | "tablet",
    deviceLabel: (row.device_label as string) || null,
    isPrimary: row.is_primary as boolean,
    verified: row.verified as boolean,
    lastSeen: row.last_seen as string,
    createdAt: row.created_at as string,
  };
}

// ─── GET /api/admin/licenses?scope=KEY|allPeriods=1 ───
export async function GET(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const resolved = await resolveAdminScope(request);

    if (!isSupabaseServerConfigured) {
      let licenses = Array.from(mockLicenses.values());
      if (resolved.mode === "scoped") {
        licenses = licenses.filter(
          (l) =>
            l.semester === resolved.scope.semester &&
            l.examPeriod === resolved.scope.examPeriod &&
            l.jurusan === resolved.scope.jurusan
        );
      }
      const keys = new Set(licenses.map((l) => l.key));
      const activations = Array.from(mockActivations.values()).filter((a) => keys.has(a.licenseKey));
      const actIds = new Set(activations.map((a) => a.id));
      const devices = mockDevices.filter((d) => actIds.has(d.activationId));
      return NextResponse.json({ licenses, activations, devices });
    }

    const supabase = createServerClient()!;

    let licQ = supabase.from("license_keys").select("*").order("created_at", { ascending: false });
    if (resolved.mode === "scoped") {
      licQ = licQ
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }

    const { data: licenseRows, error: licErr } = await licQ;
    if (licErr) throw licErr;

    const scopedKeys = ((licenseRows ?? []) as LicenseRowWithScope[]).map((r) => r.key);

    // Activations + devices + profiles filtered to in-scope license_keys.
    const [activationRes, profileRes] = await Promise.all([
      scopedKeys.length === 0
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from("activations")
            .select("*")
            .in("license_key", scopedKeys)
            .order("activated_at", { ascending: false }),
      scopedKeys.length === 0
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from("user_profiles")
            .select("license_key, email, phone")
            .in("license_key", scopedKeys),
    ]);

    const activations = ((activationRes.data ?? []) as Record<string, unknown>[]).map(mapActivationRow);
    const activationIds = activations.map((a) => a.id);

    const deviceRes = activationIds.length === 0
      ? { data: [] as Record<string, unknown>[], error: null }
      : await supabase
          .from("devices")
          .select("*")
          .in("activation_id", activationIds)
          .order("last_seen", { ascending: false });

    const devices = ((deviceRes.data ?? []) as Record<string, unknown>[]).map(mapDeviceRow);

    const licenses = ((licenseRows ?? []) as Record<string, unknown>[]).map(mapLicenseRow);

    const profiles: Record<string, { email: string | null; phone: string | null }> = {};
    for (const row of (profileRes.data ?? []) as Record<string, unknown>[]) {
      profiles[row.license_key as string] = {
        email: (row.email as string) || null,
        phone: (row.phone as string) || null,
      };
    }

    // OAuth links - map license_key → { email, linkedAt, provider }
    const oauthLinks: Record<
      string,
      { email: string; linkedAt: string; provider: string }
    > = {};
    if (scopedKeys.length > 0) {
      const { data: linkRows } = await supabase
        .from("oauth_links")
        .select("license_key, email, linked_at, provider")
        .in("license_key", scopedKeys);
      for (const row of (linkRows ?? []) as Record<string, unknown>[]) {
        oauthLinks[row.license_key as string] = {
          email: row.email as string,
          linkedAt: row.linked_at as string,
          provider: (row.provider as string) || "google",
        };
      }
    }

    return NextResponse.json({ licenses, activations, devices, profiles, oauthLinks });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin licenses GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/admin/licenses - Create license key ───
export async function POST(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolved = await resolveAdminScope(request);
    const body = await request.json();
    const { key: rawKey, name, daysActive, isAdmin, isTester, maxDevices, unlimitedDevices, packageTier, linkedEmail } = body;
    // Keys are looked up uppercased at login (validate route uppercases input);
    // store them uppercased so custom admin-typed keys match on login.
    const key = typeof rawKey === "string" ? rawKey.trim().toUpperCase() : rawKey;

    // Allow body.scope override (e.g. "All periods" mode admin explicitly picks a scope in form).
    let scope = resolved.mode === "scoped" ? resolved.scope : null;
    if (body.scope) {
      const s = parseScopeKey(body.scope);
      if (!s || !isAvailableScope(s)) {
        return NextResponse.json({ error: "Invalid body.scope" }, { status: 400 });
      }
      scope = s;
    }
    if (!scope) {
      return NextResponse.json(
        { error: "License creation requires a specific scope. Provide body.scope or pick a scope in the admin header." },
        { status: 400 }
      );
    }

    if (!key || !name) {
      return NextResponse.json(
        { error: "key and name are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (!isSupabaseServerConfigured) {
      if (mockLicenses.has(key)) {
        return NextResponse.json(
          { error: "License key already exists" },
          { status: 409 }
        );
      }
      const license = {
        key,
        name: name.trim(),
        daysActive: daysActive || 0,
        isAdmin: isAdmin || false,
        isTester: isTester || false,
        maxDevices: maxDevices || 2,
        unlimitedDevices: unlimitedDevices || false,
        fixedExpiry: null,
        suspendedUntil: null,
        totalQuizScore: 0,
        totalOnlineMinutes: 0,
        packageTier: (packageTier as "share" | "normal" | "vip" | "diamond") || "normal",
        createdAt: now,
        updatedAt: now,
        semester: scope.semester,
        examPeriod: scope.examPeriod,
        jurusan: scope.jurusan,
      };
      mockLicenses.set(key, license);
      return NextResponse.json({ license });
    }

    const supabase = createServerClient()!;

    // Pre-check OAuth email uniqueness before creating license.
    const trimmedEmail =
      typeof linkedEmail === "string" ? linkedEmail.trim().toLowerCase() : "";
    if (trimmedEmail) {
      const { data: existingLink } = await supabase
        .from("oauth_links")
        .select("license_key")
        .eq("email_lower", trimmedEmail)
        .maybeSingle();
      if (existingLink) {
        return NextResponse.json(
          { error: "Email sudah terhubung ke license lain." },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from("license_keys")
      .insert({
        key,
        name: name.trim(),
        days_active: daysActive || 0,
        is_admin: isAdmin || false,
        is_tester: isTester || false,
        max_devices: maxDevices || 2,
        unlimited_devices: unlimitedDevices || false,
        package_tier: packageTier || "normal",
        ...scopeColumns(scope),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "License key already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    // Link Google email if provided.
    if (trimmedEmail) {
      const { error: linkErr } = await supabase.from("oauth_links").insert({
        license_key: data.key,
        email: trimmedEmail,
        provider: "google",
      });
      if (linkErr && linkErr.code === "23505") {
        return NextResponse.json(
          { error: "Email sudah terhubung ke license lain." },
          { status: 409 }
        );
      }
      if (linkErr) {
        console.error("oauth_links insert error:", linkErr);
      }
    }

    return NextResponse.json({
      license: { ...mapLicenseRow(data), linkedEmail: trimmedEmail || null },
    });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin licenses POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PUT /api/admin/licenses - Update license key ───
export async function PUT(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolved = await resolveAdminScope(request);
    const body = await request.json();
    const { key, ...updates } = body;

    if (!key) {
      return NextResponse.json(
        { error: "key is required" },
        { status: 400 }
      );
    }

    // Allow admin in "All periods" to migrate a license between scopes by
    // sending body.scope explicitly. When scoped, we guard the update so
    // a row outside the current scope is untouched.
    let scopeMoveTo: { semester: number; exam_period: "uts" | "uas"; jurusan: string } | null = null;
    if (updates.scope) {
      const s = parseScopeKey(updates.scope as string);
      if (!s || !isAvailableScope(s)) {
        return NextResponse.json({ error: "Invalid updates.scope" }, { status: 400 });
      }
      scopeMoveTo = { semester: s.semester, exam_period: s.examPeriod, jurusan: s.jurusan };
    }

    if (!isSupabaseServerConfigured) {
      const license = mockLicenses.get(key);
      if (!license) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (resolved.mode === "scoped") {
        if (
          license.semester !== resolved.scope.semester ||
          license.examPeriod !== resolved.scope.examPeriod ||
          license.jurusan !== resolved.scope.jurusan
        ) {
          return NextResponse.json({ error: "License tidak ada di scope ini" }, { status: 404 });
        }
      }
      const updated = {
        ...license,
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.daysActive !== undefined && { daysActive: updates.daysActive }),
        ...(updates.maxDevices !== undefined && { maxDevices: updates.maxDevices }),
        ...(updates.unlimitedDevices !== undefined && { unlimitedDevices: updates.unlimitedDevices }),
        ...(updates.isAdmin !== undefined && { isAdmin: updates.isAdmin }),
        ...(updates.isTester !== undefined && { isTester: updates.isTester }),
        ...(updates.packageTier !== undefined && { packageTier: updates.packageTier }),
        ...(updates.suspendedUntil !== undefined && { suspendedUntil: updates.suspendedUntil }),
        ...(updates.fixedExpiry !== undefined && { fixedExpiry: updates.fixedExpiry }),
        ...(scopeMoveTo && {
          semester: scopeMoveTo.semester,
          examPeriod: scopeMoveTo.exam_period,
          jurusan: scopeMoveTo.jurusan,
        }),
        updatedAt: new Date().toISOString(),
      };
      mockLicenses.set(key, updated);
      return NextResponse.json({ license: updated });
    }

    const supabase = createServerClient()!;
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.daysActive !== undefined) dbUpdates.days_active = updates.daysActive;
    if (updates.maxDevices !== undefined) dbUpdates.max_devices = updates.maxDevices;
    if (updates.unlimitedDevices !== undefined) dbUpdates.unlimited_devices = updates.unlimitedDevices;
    if (updates.isAdmin !== undefined) dbUpdates.is_admin = updates.isAdmin;
    if (updates.isTester !== undefined) dbUpdates.is_tester = updates.isTester;
    if (updates.packageTier !== undefined) dbUpdates.package_tier = updates.packageTier;
    if (updates.suspendedUntil !== undefined) dbUpdates.suspended_until = updates.suspendedUntil;
    if (updates.fixedExpiry !== undefined) dbUpdates.fixed_expiry = updates.fixedExpiry;
    if (scopeMoveTo) {
      dbUpdates.semester = scopeMoveTo.semester;
      dbUpdates.exam_period = scopeMoveTo.exam_period;
      dbUpdates.jurusan = scopeMoveTo.jurusan;
    }

    let q = supabase
      .from("license_keys")
      .update(dbUpdates)
      .eq("key", key);
    if (resolved.mode === "scoped") {
      q = q
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }

    const { data, error } = await q.select().single();

    if (error) throw error;

    // OAuth link management: linkedEmail present (non-empty) = upsert, null/"" = delete.
    let linkedEmailOut: string | null = null;
    if (Object.prototype.hasOwnProperty.call(updates, "linkedEmail")) {
      const raw = updates.linkedEmail;
      if (raw === null || (typeof raw === "string" && raw.trim() === "")) {
        await supabase.from("oauth_links").delete().eq("license_key", key);
      } else if (typeof raw === "string") {
        const email = raw.trim();
        const emailLower = email.toLowerCase();
        // Reject if email is already linked to a different license.
        const { data: collision } = await supabase
          .from("oauth_links")
          .select("license_key")
          .eq("email_lower", emailLower)
          .neq("license_key", key)
          .maybeSingle();
        if (collision) {
          return NextResponse.json(
            { error: "Email sudah terhubung ke license lain." },
            { status: 409 }
          );
        }
        const { error: upsertErr } = await supabase.from("oauth_links").upsert(
          { license_key: key, email, provider: "google", linked_at: new Date().toISOString() },
          { onConflict: "license_key" }
        );
        if (upsertErr) {
          console.error("oauth_links upsert error:", upsertErr);
        } else {
          linkedEmailOut = email;
        }
      }
    } else {
      // No change requested - fetch current link to surface in response.
      const { data: existing } = await supabase
        .from("oauth_links")
        .select("email")
        .eq("license_key", key)
        .maybeSingle();
      linkedEmailOut = (existing?.email as string) || null;
    }

    return NextResponse.json({
      license: { ...mapLicenseRow(data), linkedEmail: linkedEmailOut },
    });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin licenses PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/licenses - Delete license key ───
export async function DELETE(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolved = await resolveAdminScope(request);
    requireScopedMode(resolved);

    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json(
        { error: "key is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      const lic = mockLicenses.get(key);
      if (lic) {
        if (
          lic.semester !== resolved.scope.semester ||
          lic.examPeriod !== resolved.scope.examPeriod ||
          lic.jurusan !== resolved.scope.jurusan
        ) {
          return NextResponse.json({ error: "Tidak boleh delete lintas scope" }, { status: 403 });
        }
        mockLicenses.delete(key);
        for (const [id, act] of mockActivations.entries()) {
          if (act.licenseKey === key) mockActivations.delete(id);
        }
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const { error } = await supabase
      .from("license_keys")
      .delete()
      .eq("key", key)
      .eq("semester", resolved.scope.semester)
      .eq("exam_period", resolved.scope.examPeriod)
      .eq("jurusan", resolved.scope.jurusan);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin licenses DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/licenses - Reset devices for a license key ───
export async function PATCH(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolved = await resolveAdminScope(request);
    requireScopedMode(resolved);

    const body = await request.json();
    const { key, action } = body;

    if (!key || action !== "reset-devices") {
      return NextResponse.json(
        { error: "key and action='reset-devices' required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      const activationIds = Array.from(mockActivations.values())
        .filter((a) => a.licenseKey === key)
        .map((a) => a.id);
      const remaining = mockDevices.filter(
        (d) => !activationIds.includes(d.activationId)
      );
      mockDevices.length = 0;
      mockDevices.push(...remaining);
      return NextResponse.json({ success: true, deletedCount: activationIds.length });
    }

    const supabase = createServerClient()!;

    // Verify the license belongs to admin's current scope before resetting devices.
    const { data: licRow } = await supabase
      .from("license_keys")
      .select("key")
      .eq("key", key)
      .eq("semester", resolved.scope.semester)
      .eq("exam_period", resolved.scope.examPeriod)
      .eq("jurusan", resolved.scope.jurusan)
      .maybeSingle();
    if (!licRow) {
      return NextResponse.json({ error: "License tidak ada di scope ini" }, { status: 404 });
    }

    const { data: activations } = await supabase
      .from("activations")
      .select("id")
      .eq("license_key", key);

    if (!activations || activations.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }

    const activationIds = activations.map((a) => a.id);

    const { error, count } = await supabase
      .from("devices")
      .delete()
      .in("activation_id", activationIds);

    if (error) throw error;

    await supabase
      .from("presence")
      .delete()
      .eq("license_key", key)
      .then(() => {});

    return NextResponse.json({ success: true, deletedCount: count || 0 });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin licenses PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
