"use client";

/**
 * Live online presence via Supabase Realtime **Presence** (in-memory broadcast)
 * instead of polling the `presence` table. This adds ZERO Postgres/WAL/disk IO
 * (presence sync is broadcast between channel members, never written), and
 * removes the old 120s SELECT polling — so the live online list gets faster AND
 * cheaper. The `presence` TABLE heartbeat (src/lib/presence.ts) stays, but only
 * for counting study minutes — nothing reads it for the live list anymore.
 *
 * Singleton + token-refcounted: every useOnlineUsers() instance shares ONE
 * channel per scope. Each device tracks its own identity (incl. role from the
 * session, so no roles API call is needed); the list is grouped by license key
 * to merge a user's multiple devices.
 */

import { createClient } from "@/lib/supabase/client";
import { scopeKey as toScopeKey } from "@/lib/scope";
import { capitalizeFirst } from "@/lib/name";
import type { ScopeTuple } from "@/types/scope";
import type { OnlineUser } from "@/types";

type DeviceType = "desktop" | "mobile" | "tablet";

export interface PresenceSelf {
  userId: string; // device id — unique presence key so 2 devices both show
  userName: string;
  licenseKey: string;
  deviceType: DeviceType;
  isAdmin: boolean;
  isTester: boolean;
  packageTier: "share" | "normal" | "vip" | "diamond" | null;
}

export interface PresenceDynamic {
  currentSubject: string | null;
  hideStatus: boolean;
}

type Meta = PresenceSelf & PresenceDynamic & { lastSeen: string };

type Channel = NonNullable<ReturnType<typeof createClient>>["channel"] extends (
  ...args: infer _A
) => infer R
  ? R
  : never;

let channel: Channel | null = null;
let activeKey = "";
let self: PresenceSelf | null = null;
let dyn: PresenceDynamic = { currentSubject: null, hideStatus: false };
let users: OnlineUser[] = [];

const tokens = new Set<symbol>();
const subs = new Set<() => void>();
const joinSubs = new Set<(metas: Meta[]) => void>();

function notify() {
  subs.forEach((f) => f());
}

function rebuild() {
  if (!channel) {
    users = [];
    notify();
    return;
  }
  const state = channel.presenceState() as unknown as Record<string, Meta[]>;
  const flat: Meta[] = [];
  for (const k in state) for (const m of state[k]) flat.push(m);

  // Group a user's multiple devices into one entry (same as the old SQL path).
  const grouped = new Map<string, OnlineUser>();
  for (const m of flat) {
    const key = m.licenseKey ? m.licenseKey.toUpperCase() : m.userId;
    const dt: DeviceType = m.deviceType || "desktop";
    const existing = grouped.get(key);
    if (existing) {
      existing.deviceCount += 1;
      existing.deviceTypes = existing.deviceTypes || [existing.deviceType];
      if (!existing.deviceTypes.includes(dt)) existing.deviceTypes.push(dt);
      if ((m.lastSeen || "") > existing.lastSeen) {
        existing.lastSeen = m.lastSeen;
        existing.userName = capitalizeFirst(m.userName || "Unknown");
        existing.currentSubject = m.currentSubject ?? null;
        existing.hideStatus = m.hideStatus ?? false;
      }
    } else {
      grouped.set(key, {
        id: m.userId,
        userName: capitalizeFirst(m.userName || "Unknown"),
        deviceType: dt,
        deviceTypes: [dt],
        currentSubject: m.currentSubject ?? null,
        hideStatus: m.hideStatus ?? false,
        licenseKey: m.licenseKey || "",
        lastSeen: m.lastSeen || new Date().toISOString(),
        deviceCount: 1,
        isAdmin: m.isAdmin ?? false,
        isTester: m.isTester ?? false,
        packageTier: m.packageTier ?? null,
      });
    }
  }
  users = Array.from(grouped.values());
  notify();
}

function trackNow() {
  if (!channel || !self) return;
  void channel.track({
    ...self,
    currentSubject: dyn.currentSubject,
    hideStatus: dyn.hideStatus,
    lastSeen: new Date().toISOString(),
  } as Meta);
}

function teardown() {
  if (channel) {
    try {
      void channel.untrack();
    } catch {
      /* ignore */
    }
    try {
      void channel.unsubscribe();
    } catch {
      /* ignore */
    }
  }
  channel = null;
  activeKey = "";
  users = [];
  notify();
}

function ensureChannel(scope: ScopeTuple, selfPayload: PresenceSelf, dyn0: PresenceDynamic) {
  self = selfPayload; // always refresh identity
  const key = toScopeKey(scope);
  if (channel && activeKey === key) return; // already on the right scope
  if (channel && activeKey !== key) teardown(); // scope changed → rejoin

  dyn = dyn0;
  activeKey = key;
  const supabase = createClient();
  if (!supabase) return;

  channel = supabase.channel(`${key}:presence`, {
    config: { presence: { key: selfPayload.userId } },
  });
  channel
    .on("presence", { event: "sync" }, rebuild)
    .on("presence", { event: "join" }, (payload: { newPresences?: Meta[] }) => {
      joinSubs.forEach((f) => f(payload?.newPresences ?? []));
      rebuild();
    })
    .on("presence", { event: "leave" }, rebuild)
    .subscribe((status: string) => {
      if (status === "SUBSCRIBED") trackNow();
    });
}

/** Read the current live list (sync; updates via subscribeLiveUsers). */
export function getLiveUsers(): OnlineUser[] {
  return users;
}

export function subscribeLiveUsers(fn: () => void): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

/** Fired with the newly-joined presences (for VIP-online toasts). */
export function onPresenceJoin(fn: (metas: Meta[]) => void): () => void {
  joinSubs.add(fn);
  return () => {
    joinSubs.delete(fn);
  };
}

/** Update + re-broadcast this device's subject/hide status (no DB write). */
export function setLocalDynamic(next: Partial<PresenceDynamic>) {
  dyn = { ...dyn, ...next };
  trackNow();
}

/**
 * Leave the live list WITHOUT tearing down the channel — used when the tab is
 * hidden/backgrounded so others see us go offline instantly. The channel stays
 * subscribed (cheap), so presenceRetrack() re-announces us with no re-join cost.
 */
export function presenceUntrack() {
  if (channel) {
    try {
      void channel.untrack();
    } catch {
      /* ignore */
    }
  }
}

/** Re-announce this device on the presence channel (tab visible again). */
export function presenceRetrack() {
  trackNow();
}

/**
 * Join the per-scope presence channel. Returns a disposer; the channel is torn
 * down only when the last holder disposes (token refcount).
 */
export function joinPresence(
  scope: ScopeTuple,
  selfPayload: PresenceSelf,
  initialDyn: PresenceDynamic
): () => void {
  const token = Symbol("presence");
  tokens.add(token);
  ensureChannel(scope, selfPayload, initialDyn);
  return () => {
    tokens.delete(token);
    if (tokens.size === 0) teardown();
  };
}
