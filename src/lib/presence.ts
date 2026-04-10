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

const ONLINE_MINUTES_SYNC_MS = 60 * 1000; // 1 minute — sync more frequently to minimize loss on tab close

export async function setupPresence(opts: {
  userId: string;
  userName: string;
  licenseKey: string;
  deviceType: string;
  hideStatus: boolean;
}): Promise<() => void> {
  // Heartbeat via API route (uses service_role, bypasses RLS)
  const sendHeartbeat = async (syncMinutes = false) => {
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
        const minutes = Math.floor(visibleSeconds / 60);
        payload.minutesToSync = minutes > 0 ? minutes : 1;
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

  // Online minutes sync — every 2 minutes, sync accumulated visible time
  if (onlineMinutesInterval) clearInterval(onlineMinutesInterval);
  onlineMinutesInterval = setInterval(() => {
    const minutes = Math.floor(visibleSeconds / 60);
    if (minutes < 1) return; // nothing to sync yet
    visibleSeconds = visibleSeconds % 60; // keep remainder seconds
    sendHeartbeat(true);
  }, ONLINE_MINUTES_SYNC_MS);

  const onVisibilityChange = () => {
    startHeartbeat();
    if (!document.hidden) sendHeartbeat(); // immediate heartbeat when tab becomes visible
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Mark offline on tab close (sendBeacon fires reliably during unload)
  // Include accumulated visible minutes so short sessions don't lose time
  const onBeforeUnload = () => {
    try {
      const minutesToSync = Math.floor(visibleSeconds / 60);
      navigator.sendBeacon(
        "/api/presence",
        new Blob(
          [JSON.stringify({
            action: "offline",
            userId: opts.userId,
            licenseKey: opts.licenseKey,
            syncMinutes: minutesToSync > 0,
            minutesToSync,
          })],
          { type: "application/json" }
        )
      );
    } catch {}
  };
  window.addEventListener("beforeunload", onBeforeUnload);

  // Cleanup function
  return () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (onlineMinutesInterval) clearInterval(onlineMinutesInterval);
    if (visibleSecondsInterval) clearInterval(visibleSecondsInterval);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("beforeunload", onBeforeUnload);

    // Best-effort offline signal via sendBeacon (reliable during tab close)
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
            minutesToSync,
          })],
          { type: "application/json" }
        )
      );
    } catch {
      // Fallback: fire-and-forget fetch
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "offline",
          userId: opts.userId,
          licenseKey: opts.licenseKey,
          syncMinutes: minutesToSync > 0,
          minutesToSync,
        }),
        keepalive: true,
      }).catch(() => {});
    }
    visibleSeconds = 0;
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
