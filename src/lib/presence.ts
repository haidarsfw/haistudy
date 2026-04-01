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

const ONLINE_MINUTES_SYNC_MS = 5 * 60 * 1000; // 5 minutes

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
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          userId: opts.userId,
          userName: opts.userName,
          licenseKey: opts.licenseKey,
          deviceType: opts.deviceType,
          hideStatus: opts.hideStatus,
          syncMinutes,
        }),
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

  // Online minutes sync — every 5 minutes of visible time
  if (onlineMinutesInterval) clearInterval(onlineMinutesInterval);
  onlineMinutesInterval = setInterval(() => {
    if (document.hidden) return; // Only count visible time
    sendHeartbeat(true); // syncMinutes = true triggers server-side increment
  }, ONLINE_MINUTES_SYNC_MS);

  const onVisibilityChange = () => {
    startHeartbeat();
    if (!document.hidden) sendHeartbeat(); // immediate heartbeat when tab becomes visible
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Mark offline on tab close (sendBeacon fires reliably during unload)
  const onBeforeUnload = () => {
    try {
      navigator.sendBeacon(
        "/api/presence",
        new Blob(
          [JSON.stringify({ action: "offline", userId: opts.userId })],
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
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("beforeunload", onBeforeUnload);

    // Best-effort offline signal via sendBeacon (reliable during tab close)
    try {
      navigator.sendBeacon(
        "/api/presence",
        new Blob(
          [JSON.stringify({ action: "offline", userId: opts.userId })],
          { type: "application/json" }
        )
      );
    } catch {
      // Fallback: fire-and-forget fetch
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "offline", userId: opts.userId }),
        keepalive: true,
      }).catch(() => {});
    }
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

  // Filter stale entries (last_seen older than 2 minutes)
  const STALE_MS = 3 * 60 * 1000;
  const now = Date.now();
  const freshData = (data || []).filter((row: Record<string, unknown>) => {
    const lastSeen = new Date(row.last_seen as string).getTime();
    return now - lastSeen < STALE_MS;
  });

  // Map snake_case DB columns → camelCase TypeScript interface
  return freshData.map((row: Record<string, unknown>) => ({
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
