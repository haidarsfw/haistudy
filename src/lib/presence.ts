/**
 * Presence utilities.
 * Manages online status via /api/presence (server-side, bypasses RLS).
 * Reads via Supabase anon key (SELECT policy exists).
 */

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  PRESENCE_HEARTBEAT_VISIBLE_MS,
  PRESENCE_HEARTBEAT_HIDDEN_MS,
} from "@/lib/constants";
import type { OnlineUser } from "@/types";

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let onlineMinutesInterval: ReturnType<typeof setInterval> | null = null;
let visibleSecondsInterval: ReturnType<typeof setInterval> | null = null;
let visibleSeconds = 0;
let hasSentOffline = false;

const ONLINE_MINUTES_SYNC_MS = 60 * 1000; // 1 minute — sync more frequently to minimize loss on tab close

export async function setupPresence(opts: {
  userId: string;
  userName: string;
  licenseKey: string;
  deviceType: string;
  hideStatus: boolean;
}): Promise<() => void> {
  // Heartbeat via API route (uses service_role, bypasses RLS)
  // explicitMinutes: when called from the sync interval, pass the pre-calculated
  // minutes so we don't re-derive from the (already-reset) visibleSeconds.
  const sendHeartbeat = async (syncMinutes = false, explicitMinutes?: number) => {
    try {
      const payload: Record<string, unknown> = {
        action: "heartbeat",
        userId: opts.userId,
        userName: opts.userName,
        licenseKey: opts.licenseKey,
        deviceType: opts.deviceType,
        hideStatus: opts.hideStatus,
        syncMinutes,
      };
      if (syncMinutes) {
        // Use explicit value when provided (from sync interval), otherwise
        // fall back to the current accumulator (from ad-hoc calls).
        const minutes = explicitMinutes ?? Math.floor(visibleSeconds / 60);
        if (minutes < 1) {
          // Nothing meaningful to sync — skip the flag so server doesn't
          // attempt a zero-minute increment.
          payload.syncMinutes = false;
        } else {
          payload.minutesToSync = minutes;
        }
      }
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Network error — ignore, will retry next interval
    }
  };

  // Reset offline guard for this session
  hasSentOffline = false;

  // Initial heartbeat
  await sendHeartbeat();

  // Heartbeat interval — faster when tab is visible
  const startHeartbeat = () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    const interval = document.hidden
      ? PRESENCE_HEARTBEAT_HIDDEN_MS
      : PRESENCE_HEARTBEAT_VISIBLE_MS;
    heartbeatInterval = setInterval(() => sendHeartbeat(), interval);
  };

  startHeartbeat();

  // Visible-time accumulator — ticks every second only when tab is visible
  visibleSeconds = 0;
  if (visibleSecondsInterval) clearInterval(visibleSecondsInterval);
  visibleSecondsInterval = setInterval(() => {
    if (!document.hidden) visibleSeconds++;
  }, 1000);

  // Online minutes sync — every minute, sync accumulated visible time
  if (onlineMinutesInterval) clearInterval(onlineMinutesInterval);
  onlineMinutesInterval = setInterval(() => {
    const minutes = Math.floor(visibleSeconds / 60);
    if (minutes < 1) return; // nothing to sync yet
    visibleSeconds = visibleSeconds % 60; // keep remainder seconds
    // Pass the pre-calculated minutes so sendHeartbeat doesn't re-derive
    // from the (now-reset) visibleSeconds.
    sendHeartbeat(true, minutes);
  }, ONLINE_MINUTES_SYNC_MS);

  const onVisibilityChange = () => {
    startHeartbeat();
    if (!document.hidden) {
      sendHeartbeat(); // immediate heartbeat when tab becomes visible (no minute sync)
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Mark offline on tab close (sendBeacon fires reliably during unload)
  // Include accumulated visible minutes so short sessions don't lose time
  const sendOfflineBeacon = () => {
    if (hasSentOffline) return; // guard against double-counting
    hasSentOffline = true;
    const minutesToSync = Math.floor(visibleSeconds / 60);
    try {
      navigator.sendBeacon(
        "/api/presence",
        new Blob(
          [JSON.stringify({
            action: "offline",
            userId: opts.userId,
            licenseKey: opts.licenseKey,
            syncMinutes: minutesToSync > 0,
            minutesToSync: minutesToSync > 0 ? minutesToSync : 0,
          })],
          { type: "application/json" }
        )
      );
    } catch {
      // sendBeacon failed — fire-and-forget fallback
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "offline",
          userId: opts.userId,
          licenseKey: opts.licenseKey,
          syncMinutes: minutesToSync > 0,
          minutesToSync: minutesToSync > 0 ? minutesToSync : 0,
        }),
        keepalive: true,
      }).catch(() => {});
    }
    visibleSeconds = 0;
  };

  const onBeforeUnload = () => sendOfflineBeacon();
  window.addEventListener("beforeunload", onBeforeUnload);

  // Cleanup function
  return () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (onlineMinutesInterval) clearInterval(onlineMinutesInterval);
    if (visibleSecondsInterval) clearInterval(visibleSecondsInterval);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("beforeunload", onBeforeUnload);

    // Best-effort offline signal — reuse the same guarded function
    // so we never double-count with the beforeunload handler.
    sendOfflineBeacon();
  };
}

export async function fetchOnlineUsers(): Promise<OnlineUser[]> {
  if (!isSupabaseConfigured) return getMockOnlineUsers();

  const supabase = createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("presence")
    .select("*")
    .eq("online", true)
    .order("last_seen", { ascending: false });

  // Filter stale entries (last_seen older than 3 minutes — tolerates up to 5 missed 30s heartbeats)
  const STALE_MS = 3 * 60 * 1000;
  const now = Date.now();
  const freshData = (data || []).filter((row: Record<string, unknown>) => {
    const lastSeen = new Date(row.last_seen as string).getTime();
    return now - lastSeen < STALE_MS;
  });

  // Map snake_case DB columns → camelCase TypeScript interface
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
      // Collect unique device types
      if (!existing.deviceTypes?.includes(user.deviceType)) {
        existing.deviceTypes = existing.deviceTypes || [existing.deviceType];
        existing.deviceTypes.push(user.deviceType);
      }
      // Keep the most recent lastSeen
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
