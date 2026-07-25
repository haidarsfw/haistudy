// ============================================
// Devices on an account, and letting people manage them
// ============================================
//
// Self-service device removal is the whole point: "jatah perangkat saya penuh"
// was the message that arrived over and over, and every one of them needed a
// human to answer. Now the user can free a slot themselves.
//
// Unlimited self-service removal, though, turns a 3-device licence into a rota
// three friends take turns on. So: the FIRST release in any 24 hours is
// instant — someone's phone really did break, mid-exam-season, and minutes
// matter — and the next one is held for 12 hours. An honest user never meets
// the second rule; someone passing an account around hits it on attempt two.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Instant, then held. See the note above for why it is shaped this way. */
const FREEZE_MS = 12 * 60 * 60 * 1000;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface AccountDevice {
  id: string;
  deviceId: string;
  deviceType: string;
  label: string | null;
  lastSeen: string | null;
  licenseKey: string;
  scopeKey: string;
}

export interface DeviceSlots {
  licenseKey: string;
  scopeKey: string;
  used: number;
  max: number;
  unlimited: boolean;
}

interface DeviceView {
  devices: AccountDevice[];
  slots: DeviceSlots[];
}

/**
 * Every device signed into any of this account's accesses.
 *
 * Three small queries rather than one nested embed: the join runs
 * devices → activations → license_keys, and Supabase's nested `!inner` syntax
 * for two levels is exactly the kind of thing that silently returns an empty
 * array when a relationship name shifts. This page is opened rarely, so
 * clarity wins over the round trip.
 */
export async function listAccountDevices(
  supabase: SupabaseClient,
  accountId: string
): Promise<DeviceView> {
  const { data: licenses } = await supabase
    .from("license_keys")
    .select("key, semester, exam_period, jurusan, max_devices, unlimited_devices")
    .eq("account_id", accountId);

  if (!licenses?.length) return { devices: [], slots: [] };

  const keys = licenses.map((l) => l.key as string);
  const scopeOf = new Map(
    licenses.map((l) => [
      l.key as string,
      `s${l.semester}-${l.exam_period}-${l.jurusan}`,
    ])
  );

  const { data: activations } = await supabase
    .from("activations")
    .select("id, license_key")
    .in("license_key", keys);

  if (!activations?.length) {
    return {
      devices: [],
      slots: licenses.map((l) => ({
        licenseKey: l.key as string,
        scopeKey: scopeOf.get(l.key as string)!,
        used: 0,
        max: (l.max_devices as number) ?? 2,
        unlimited: Boolean(l.unlimited_devices),
      })),
    };
  }

  const licenseOfActivation = new Map(
    activations.map((a) => [a.id as string, a.license_key as string])
  );

  const { data: rows } = await supabase
    .from("devices")
    .select("id, activation_id, device_id, device_type, device_label, last_seen")
    .in(
      "activation_id",
      activations.map((a) => a.id as string)
    )
    .order("last_seen", { ascending: false });

  const devices: AccountDevice[] = (rows ?? []).map((d) => {
    const licenseKey = licenseOfActivation.get(d.activation_id as string) ?? "";
    return {
      id: d.id as string,
      deviceId: d.device_id as string,
      deviceType: (d.device_type as string) ?? "desktop",
      label: (d.device_label as string) ?? null,
      lastSeen: (d.last_seen as string) ?? null,
      licenseKey,
      scopeKey: scopeOf.get(licenseKey) ?? "",
    };
  });

  const slots: DeviceSlots[] = licenses.map((l) => ({
    licenseKey: l.key as string,
    scopeKey: scopeOf.get(l.key as string)!,
    used: devices.filter((d) => d.licenseKey === l.key).length,
    max: (l.max_devices as number) ?? 2,
    unlimited: Boolean(l.unlimited_devices),
  }));

  return { devices, slots };
}

export interface ReleaseDecision {
  allowed: boolean;
  /** Seconds until another release is possible. 0 when allowed. */
  retryAfter: number;
}

/** May this licence give up another device right now? */
export async function checkReleaseCooldown(
  supabase: SupabaseClient,
  licenseKey: string
): Promise<ReleaseDecision> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("device_releases")
    .select("released_at")
    .eq("license_key", licenseKey)
    .gte("released_at", since)
    .order("released_at", { ascending: false })
    .limit(1);

  // Fails open: a database hiccup must not strand someone whose phone broke.
  if (error || !data || data.length === 0) return { allowed: true, retryAfter: 0 };

  const until = new Date(data[0].released_at).getTime() + FREEZE_MS;
  const remaining = until - Date.now();
  if (remaining <= 0) return { allowed: true, retryAfter: 0 };
  return { allowed: false, retryAfter: Math.ceil(remaining / 1000) };
}

export interface ReleaseResult {
  ok: boolean;
  error?: string;
  retryAfter?: number;
}

/**
 * Remove one device and record it.
 *
 * Ownership is re-checked here rather than trusted from the page: the id comes
 * from the browser, and without this anyone signed in could free a slot on
 * somebody else's licence.
 */
export async function releaseAccountDevice(
  supabase: SupabaseClient,
  accountId: string,
  deviceRowId: string
): Promise<ReleaseResult> {
  const { devices } = await listAccountDevices(supabase, accountId);
  const target = devices.find((d) => d.id === deviceRowId);
  if (!target) return { ok: false, error: "Perangkat itu tidak ada di akunmu." };

  const cooldown = await checkReleaseCooldown(supabase, target.licenseKey);
  if (!cooldown.allowed) {
    return {
      ok: false,
      error: "Kamu baru saja mengeluarkan perangkat.",
      retryAfter: cooldown.retryAfter,
    };
  }

  const { error } = await supabase.from("devices").delete().eq("id", deviceRowId);
  if (error) return { ok: false, error: "Gagal mengeluarkan perangkat." };

  await supabase.from("device_releases").insert({
    license_key: target.licenseKey,
    device_id: target.deviceId,
    released_by: accountId,
  });

  return { ok: true };
}
