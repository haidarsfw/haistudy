import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import type { LicenseKey, Activation, Device } from "@/types";

// ─── Mock store ───
const mockLicenses = new Map<string, LicenseKey>();
const mockActivations = new Map<string, Activation>();
const mockDevices: Device[] = [];

// Seed mock data
if (mockLicenses.size === 0) {
  const now = new Date().toISOString();
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

function mapLicenseRow(row: Record<string, unknown>): LicenseKey {
  return {
    key: row.key as string,
    name: row.name as string,
    daysActive: row.days_active as number,
    isAdmin: row.is_admin as boolean,
    isTester: row.is_tester as boolean,
    packageTier: (row.package_tier as "share" | "normal" | "vip") || "normal",
    maxDevices: row.max_devices as number,
    unlimitedDevices: row.unlimited_devices as boolean,
    fixedExpiry: (row.fixed_expiry as string) || null,
    suspendedUntil: (row.suspended_until as string) || null,
    totalQuizScore: (row.total_quiz_score as number) || 0,
    totalOnlineMinutes: (row.total_online_minutes as number) || 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
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

// ─── GET /api/admin/licenses ───
export async function GET() {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!isSupabaseServerConfigured) {
      const licenses = Array.from(mockLicenses.values());
      const activations = Array.from(mockActivations.values());
      return NextResponse.json({ licenses, activations, devices: mockDevices });
    }

    const supabase = createServerClient()!;

    const [licenseRes, activationRes, deviceRes] = await Promise.all([
      supabase
        .from("license_keys")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("activations")
        .select("*")
        .order("activated_at", { ascending: false }),
      supabase
        .from("devices")
        .select("*")
        .order("last_seen", { ascending: false }),
    ]);

    if (licenseRes.error) throw licenseRes.error;

    const licenses = (licenseRes.data || []).map(mapLicenseRow);
    const activations = (activationRes.data || []).map(mapActivationRow);
    const devices = (deviceRes.data || []).map(mapDeviceRow);

    return NextResponse.json({ licenses, activations, devices });
  } catch (error) {
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

    const body = await request.json();
    const { key, name, daysActive, isAdmin, isTester, maxDevices, unlimitedDevices, packageTier } = body;

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
      const license: LicenseKey = {
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
        packageTier: "normal",
        createdAt: now,
        updatedAt: now,
      };
      mockLicenses.set(key, license);
      return NextResponse.json({ license });
    }

    const supabase = createServerClient()!;
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

    return NextResponse.json({ license: mapLicenseRow(data) });
  } catch (error) {
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

    const body = await request.json();
    const { key, ...updates } = body;

    if (!key) {
      return NextResponse.json(
        { error: "key is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      const license = mockLicenses.get(key);
      if (!license) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
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

    const { data, error } = await supabase
      .from("license_keys")
      .update(dbUpdates)
      .eq("key", key)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ license: mapLicenseRow(data) });
  } catch (error) {
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

    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json(
        { error: "key is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      mockLicenses.delete(key);
      // Clean up related data
      for (const [id, act] of mockActivations.entries()) {
        if (act.licenseKey === key) mockActivations.delete(id);
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    // Cascade delete handles activations/devices via FK constraints
    const { error } = await supabase
      .from("license_keys")
      .delete()
      .eq("key", key);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin licenses DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
