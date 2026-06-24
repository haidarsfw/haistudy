/**
 * Presence utilities - v3 (server-side time tracking).
 *
 * CLIENT: Sends heartbeats every 60s (visible) / 5m (hidden).
 *         NO client-side time counting. Zero accumulators.
 * SERVER: Calculates active time from heartbeat intervals.
 *         Accumulates seconds → flushes full minutes to license_keys.
 *
 * This eliminates all previous bugs caused by client-side state being
 * reset on React effect re-runs, settings syncs, or tab lifecycle events.
 */

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  PRESENCE_HEARTBEAT_VISIBLE_MS,
  PRESENCE_HEARTBEAT_HIDDEN_MS,
} from "@/lib/constants";
import { capitalizeFirst } from "@/lib/name";
import { setLocalDynamic } from "@/lib/realtime/presence-live";
import type { OnlineUser } from "@/types";
import type { ScopeTuple } from "@/types/scope";

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let hasSentOffline = false;

// Module-level state - updated via updateHideStatus / updateCurrentSubject
// without restarting the presence setup. This avoids the critical bug where
// any prop change (settings?.hideStatus, route change) caused the entire
// presence system to restart, resetting accumulated time.
let currentHideStatus = false;
let currentSubject: string | null = null;

export function updateHideStatus(hide: boolean) {
  currentHideStatus = hide;
  // Mirror into the live presence channel so the online list updates instantly.
  setLocalDynamic({ hideStatus: hide });
}

export function updateCurrentSubject(subject: string | null) {
  currentSubject = subject;
  setLocalDynamic({ currentSubject: subject });
}

/** Current subject route, for the live presence track payload. */
export function getCurrentSubject(): string | null {
  return currentSubject;
}

export async function setupPresence(opts: {
  userId: string;
  userName: string;
  licenseKey: string;
  deviceType: string;
  hideStatus: boolean;
  currentSubject: string | null;
}): Promise<() => void> {
  currentHideStatus = opts.hideStatus;
  currentSubject = opts.currentSubject;
  hasSentOffline = false;

  // ── Simple heartbeat - no time tracking on client ──
  let lastHeartbeatAt = 0;
  const sendHeartbeat = async () => {
    lastHeartbeatAt = Date.now();
    try {
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          userId: opts.userId,
          userName: opts.userName,
          licenseKey: opts.licenseKey,
          deviceType: opts.deviceType,
          hideStatus: currentHideStatus,
          currentSubject,
        }),
      });
    } catch {
      // Network error - will retry next interval
    }
  };

  // Initial heartbeat
  await sendHeartbeat();

  // Heartbeat interval - 5m when visible, 15m when hidden (free-tier headroom)
  const startHeartbeat = () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    const ms = document.hidden
      ? PRESENCE_HEARTBEAT_HIDDEN_MS
      : PRESENCE_HEARTBEAT_VISIBLE_MS;
    heartbeatInterval = setInterval(sendHeartbeat, ms);
  };

  startHeartbeat();

  const onVisibilityChange = () => {
    startHeartbeat();
    // Immediate heartbeat on tab-return, but throttled: rapid tab switching
    // must not spam /api/presence (each call is a Vercel invocation).
    if (!document.hidden && Date.now() - lastHeartbeatAt > 60_000) {
      sendHeartbeat();
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  // ── Offline beacon - fire-and-forget when tab closes ──
  const sendOfflineBeacon = () => {
    if (hasSentOffline) return;
    hasSentOffline = true;
    const payload = JSON.stringify({
      action: "offline",
      userId: opts.userId,
      licenseKey: opts.licenseKey,
    });
    const sent = navigator.sendBeacon(
      "/api/presence",
      new Blob([payload], { type: "application/json" })
    );
    if (!sent) {
      // Beacon rejected (queue full) - use keepalive fetch as fallback
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  };

  const onBeforeUnload = () => sendOfflineBeacon();
  window.addEventListener("beforeunload", onBeforeUnload);

  // ── Cleanup ──
  return () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("beforeunload", onBeforeUnload);
    sendOfflineBeacon();
  };
}

// ════════════════════════════════════════════════════
// Read online users (unchanged)
// ════════════════════════════════════════════════════

export async function fetchOnlineUsers(scope?: ScopeTuple): Promise<OnlineUser[]> {
  if (!isSupabaseConfigured) return getMockOnlineUsers();

  const supabase = createClient();
  if (!supabase) return [];

  let q = supabase
    .from("presence")
    .select(
      "user_id, user_name, device_type, current_subject, hide_status, license_key, last_seen"
    )
    .eq("online", true);

  // Only show people in the SAME scope (semester/exam/jurusan). Without this the
  // online list bled users across every cohort.
  if (scope) {
    q = q
      .eq("semester", scope.semester)
      .eq("exam_period", scope.examPeriod)
      .eq("jurusan", scope.jurusan);
  }

  const { data } = await q
    .order("last_seen", { ascending: false })
    .limit(200);

  // Filter stale entries. Heartbeats are every 300s (visible); the cutoff MUST
  // exceed that or a still-online user blinks offline between beats. 360s = one
  // 300s beat + 60s grace (tab-close fires an instant offline beacon, so this
  // only covers crashes / lost network — they linger ~1 extra min, acceptable).
  const STALE_MS = 360_000; // 6 minutes
  const now = Date.now();
  const freshData = (data || []).filter((row: Record<string, unknown>) => {
    const lastSeen = new Date(row.last_seen as string).getTime();
    return now - lastSeen < STALE_MS;
  });

  // Batch-fetch role info for all online users (single extra query)
  const licenseKeys = Array.from(
    new Set(
      freshData
        .map((r: Record<string, unknown>) => (r.license_key as string) || "")
        .filter(Boolean)
    )
  );
  const roleMap = new Map<
    string,
    {
      isAdmin: boolean;
      isTester: boolean;
      packageTier: "share" | "normal" | "vip" | "diamond" | null;
    }
  >();
  // Resolve ranks server-side. license_keys is locked from the anon client
  // (migrations 043/044) so a direct query here 403s; /api/presence/roles does
  // the lookup behind the service_role key. Non-fatal: a failure just means no
  // badges this refresh.
  if (licenseKeys.length > 0) {
    try {
      const res = await fetch("/api/presence/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: licenseKeys }),
      });
      if (res.ok) {
        const { roles } = (await res.json()) as {
          roles: Record<
            string,
            {
              isAdmin: boolean;
              isTester: boolean;
              packageTier: "share" | "normal" | "vip" | "diamond" | null;
            }
          >;
        };
        for (const [key, role] of Object.entries(roles || {})) {
          roleMap.set(key, role);
        }
      }
    } catch {
      // Network error - badges simply won't show this refresh.
    }
  }

  const rawUsers = freshData.map((row: Record<string, unknown>) => {
    const licenseKey = (row.license_key as string) || "";
    const role = roleMap.get(licenseKey);
    return {
      id: (row.user_id as string) || (row.id as string) || "",
      userName: capitalizeFirst((row.user_name as string) || "Unknown"),
      deviceType: ((row.device_type as string) || "desktop") as
        | "desktop"
        | "mobile"
        | "tablet",
      currentSubject: (row.current_subject as string) || null,
      hideStatus: (row.hide_status as boolean) ?? false,
      licenseKey,
      lastSeen: (row.last_seen as string) || new Date().toISOString(),
      deviceCount: 1,
      isAdmin: role?.isAdmin ?? false,
      isTester: role?.isTester ?? false,
      packageTier: role?.packageTier ?? null,
    };
  });

  // Stack users with the same licenseKey (same person, multiple devices)
  const grouped = new Map<string, OnlineUser>();
  for (const user of rawUsers) {
    // Same account = same (uppercased) license key → ONE merged entry. Fall back
    // to device id only for legacy rows with no license key.
    const key = user.licenseKey ? user.licenseKey.toUpperCase() : user.id;
    const existing = grouped.get(key);
    if (existing) {
      existing.deviceCount += 1;
      if (!existing.deviceTypes?.includes(user.deviceType)) {
        existing.deviceTypes = existing.deviceTypes || [existing.deviceType];
        existing.deviceTypes.push(user.deviceType);
      }
      // Carry the freshest device's identity so the merged row stays in sync.
      if (user.lastSeen > existing.lastSeen) {
        existing.lastSeen = user.lastSeen;
        existing.userName = user.userName;
        existing.currentSubject = user.currentSubject;
        existing.hideStatus = user.hideStatus;
      }
    } else {
      grouped.set(key, { ...user, deviceTypes: [user.deviceType] });
    }
  }

  return Array.from(grouped.values());
}

// Mock data for development
function getMockOnlineUsers(): OnlineUser[] {
  return [
    {
      id: "mock-1",
      userName: "Admin",
      deviceType: "desktop",
      currentSubject: null,
      hideStatus: false,
      licenseKey: "ADMIN1",
      lastSeen: new Date().toISOString(),
      deviceCount: 1,
    },
    {
      id: "mock-2",
      userName: "Budi",
      deviceType: "mobile",
      currentSubject: "statistik",
      hideStatus: false,
      licenseKey: "B29-MOCK01",
      lastSeen: new Date().toISOString(),
      deviceCount: 1,
    },
    {
      id: "mock-3",
      userName: "Sari",
      deviceType: "desktop",
      currentSubject: "akuntansi",
      hideStatus: false,
      licenseKey: "B29-MOCK02",
      lastSeen: new Date().toISOString(),
      deviceCount: 1,
    },
  ];
}
