import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { AccountError } from "@/lib/auth/account";
import { requireAccount } from "@/lib/auth/account-session";
import { listAccountAccesses } from "@/lib/auth/account-access";
import { listAccountDevices } from "@/lib/auth/account-devices";
import {
  activateLicense,
  ActivationError,
  applySessionCookies,
} from "@/lib/auth/oauth-cookie-helpers";
import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_OPTS,
  detectDeviceType,
  newDeviceId,
  readDeviceIdentity,
} from "@/lib/auth/device-id";

/**
 * Open one purchased access.
 *
 * This is the moment "masuk ke akun" becomes "masuk ke aplikasi", and it is
 * deliberately a separate, explicit step: an account can hold several exam
 * periods, and only this call decides which one the app cookies point at.
 *
 * A browser the account has never used does not silently consume a device
 * slot. It comes back with `needsDeviceConfirm` and the current tally, so the
 * user sees "1 dari 3, sisa 1" BEFORE anything is spent. That single screen is
 * what removes the endless "jatah perangkat saya penuh entah kenapa" messages.
 */
export async function POST(req: Request) {
  // scope-exempt: the scope is derived from the licence being opened, and the
  // hs-scope cookie is an OUTPUT of this route rather than an input.
  try {
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      /* handled by the licenceKey check */
    }
    const licenseKey = String(body.licenseKey ?? "").trim();
    const confirmDevice = body.confirmDevice === true;

    if (!licenseKey) {
      return NextResponse.json({ error: "Akses tidak disebutkan" }, { status: 400 });
    }

    const supabase = createServerClient()!;

    // Ownership from the account's own list, so a licence key guessed or
    // copied from elsewhere cannot be opened here.
    const accesses = await listAccountAccesses(supabase, account.id);
    const target = accesses.find((a) => a.licenseKey === licenseKey);
    if (!target) {
      return NextResponse.json({ error: "Akses itu bukan milik akunmu" }, { status: 403 });
    }
    if (target.status === "expired") {
      return NextResponse.json(
        { error: "Akses ini sudah habis masa berlakunya.", code: "EXPIRED" },
        { status: 403 }
      );
    }
    if (target.status === "suspended") {
      return NextResponse.json(
        { error: "Akses ini sedang ditangguhkan. Hubungi admin.", code: "SUSPENDED" },
        { status: 403 }
      );
    }

    const jar = await cookies();
    // Canonical cookie first, the old Google-login name second. Reading only
    // the canonical one is what let a browser that had signed in with Google be
    // called new here and handed a SECOND device row.
    const identity = readDeviceIdentity(jar);
    const existingDeviceId = identity.id;

    const { devices, slots } = await listAccountDevices(supabase, account.id);
    const known =
      existingDeviceId &&
      devices.some((d) => d.licenseKey === licenseKey && d.deviceId === existingDeviceId);

    if (!known && !confirmDevice) {
      const slot = slots.find((s) => s.licenseKey === licenseKey);
      return NextResponse.json(
        {
          needsDeviceConfirm: true,
          used: slot?.used ?? 0,
          max: slot?.unlimited ? null : (slot?.max ?? 2),
          full: slot ? !slot.unlimited && slot.used >= slot.max : false,
          devices: devices
            .filter((d) => d.licenseKey === licenseKey)
            .map((d) => ({
              id: d.id,
              label: d.label,
              deviceType: d.deviceType,
              lastSeen: d.lastSeen,
            })),
        },
        { status: 409 }
      );
    }

    const deviceId = existingDeviceId || newDeviceId();
    const ua = req.headers.get("user-agent") || "";

    const { data: license } = await supabase
      .from("license_keys")
      .select("*")
      .eq("key", licenseKey)
      .single();
    if (!license) {
      return NextResponse.json({ error: "Akses tidak ditemukan" }, { status: 404 });
    }

    try {
      const { session } = await activateLicense(
        supabase,
        license,
        deviceId,
        detectDeviceType(ua),
        req
      );

      const redirect = `/s${session.scope.semester}/${session.scope.examPeriod}/${session.scope.jurusan}/dashboard`;
      const res = NextResponse.json({ ok: true, redirect });
      applySessionCookies(res, session);
      // Written whenever the browser is not already carrying the canonical
      // cookie — including when the id was recovered from the old name, so it
      // converges instead of relying on a cookie nothing writes any more.
      if (identity.needsCookie) {
        res.cookies.set(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTS);
      }
      return res;
    } catch (e) {
      if (e instanceof ActivationError) {
        const parsed = (await e.response.clone().json().catch(() => null)) as {
          error?: string;
          deviceLimitReached?: boolean;
        } | null;
        return NextResponse.json(
          {
            error: parsed?.error ?? "Gagal membuka akses",
            code: parsed?.deviceLimitReached ? "DEVICE_LIMIT" : "ACTIVATION_FAILED",
          },
          { status: e.response.status }
        );
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/enter] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
