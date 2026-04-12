/**
 * Presence utilities — v3 (server-side time tracking).
 *
 * CLIENT: Sends heartbeats every 30s (visible) / 5m (hidden).
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
import type { OnlineUser } from "@/types";

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let hasSentOffline = false;

// Module-level hide status — updated via updateHideStatus() without
// restarting the presence setup. This avoids the critical bug where
// settings?.hideStatus changes caused the entire presence system to
// restart, resetting accumulated time.
let currentHideStatus = false;

/**
 * Update the hide status sent with heartbeats.
 * Called from usePresence when settings.hideStatus changes.
 * Does NOT restart the heartbeat system.
 */
export function updateHideStatus(hide: boolean) {
  currentHideStatus = hide;
}

export async function setupPresence(opts: {
  userId: string;
  userName: string;
  licenseKey: string;
  deviceType: string;
  hideStatus: boolean;
}): Promise<() => void> {
  currentHideStatus = opts.hideStatus;
  hasSentOffline = false;

  // ── Simple heartbeat — no time tracking on client ──
  const sendHeartbeat = async () => {
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
        }),
      });
    } catch {
      // Network error — will retry next interval
    }
  };

  // Initial heartbeat
  await sendHeartbeat();

  // Heartbeat interval — 30s when visible, 5m when hidden
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
    if (!document.hidden) {
      // Immediate heartbeat when tab becomes visible
      sendHeartbeat();
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  // ── Offline beacon — fire-and-forget when tab closes ──
  const sendOfflineBeacon = () => {
    if (hasSentOffline) return;
    hasSentOffline = true;
    try {
      navigator.sendBeacon(
        "/api/presence",
        new Blob(
          [
            JSON.stringify({
              action: "offline",
              userId: opts.userId,
              licenseKey: opts.licenseKey,
            }),
          ],
          { type: "application/json" }
        )
      );
    } catch {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "offline",
          userId: opts.userId,
          licenseKey: opts.licenseKey,
        }),
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

export async function fetchOnlineUsers(): Promise<OnlineUser[]> {
  if (!isSupabaseConfigured) return getMockOnlineUsers();

  const supabase = createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("presence")
    .select("*")
    .eq("online", true)
    .order("last_seen", { ascending: false });

  // Filter stale entries (last_seen older than 5 minutes — tolerates missed 60s heartbeats)
  const STALE_MS = 5 * 60 * 1000;
  const now = Date.now();
  const freshData = (data || []).filter((row: Record<string, unknown>) => {
    const lastSeen = new Date(row.last_seen as string).getTime();
    return now - lastSeen < STALE_MS;
  });

  const rawUsers = freshData.map((row: Record<string, unknown>) => ({
    id: (row.user_id as string) || (row.id as string) || "",
    userName: (row.user_name as string) || "Unknown",
    deviceType: ((row.device_type as string) || "desktop") as
      | "desktop"
      | "mobile"
      | "tablet",
    currentSubject: (row.current_subject as string) || null,
    hideStatus: (row.hide_status as boolean) ?? false,
    licenseKey: (row.license_key as string) || "",
    lastSeen: (row.last_seen as string) || new Date().toISOString(),
    deviceCount: 1,
  }));

  // Stack users with the same licenseKey (same person, multiple devices)
  const grouped = new Map<string, OnlineUser>();
  for (const user of rawUsers) {
    const key = user.licenseKey || user.id;
    const existing = grouped.get(key);
    if (existing) {
      existing.deviceCount += 1;
      if (!existing.deviceTypes?.includes(user.deviceType)) {
        existing.deviceTypes = existing.deviceTypes || [existing.deviceType];
        existing.deviceTypes.push(user.deviceType);
      }
      if (user.lastSeen > existing.lastSeen) {
        existing.lastSeen = user.lastSeen;
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
