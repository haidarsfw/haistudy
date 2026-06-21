"use client";

import { useEffect, useRef, useState } from "react";
import type { OnlineUser } from "@/types";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { useSession } from "@/components/providers/session-provider";
import { useSettings } from "@/hooks/use-settings";
import { getDeviceId, getDeviceType } from "@/lib/auth/device";
import { getCurrentSubject, fetchOnlineUsers } from "@/lib/presence";
import {
  joinPresence,
  subscribeLiveUsers,
  getLiveUsers,
  onPresenceJoin,
  type PresenceSelf,
} from "@/lib/realtime/presence-live";

/**
 * Live online users via Supabase Realtime Presence (in-memory, no DB polling).
 * Replaces the old 120s `presence` table poll: instant join/leave, includes the
 * current user, and adds zero Postgres/WAL/disk IO. The DB heartbeat still runs
 * (src/lib/presence.ts) purely for study-minute accounting.
 */
export function useOnlineUsers() {
  const { session } = useSession();
  const { settings } = useSettings();
  const scopeCtx = useOptionalScope();
  const scopeKey = scopeCtx?.scopeKey ?? "";

  const [users, setUsers] = useState<OnlineUser[]>(() => getLiveUsers());
  // Fallback list from the presence TABLE, used only if the Realtime Presence
  // channel yields nobody (e.g. realtime auth blocks the channel in prod). Slow
  // 120s poll — same cadence as before, so IO is unchanged in the worst case.
  const [polled, setPolled] = useState<OnlineUser[]>([]);
  // Baseline of keys already online, so a join event only toasts genuinely-new
  // VIP/admin arrivals (not everyone present on first sync).
  const prevKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!session || !scopeCtx?.scope) return;

    const self: PresenceSelf = {
      userId: getDeviceId(),
      userName: session.shortName,
      licenseKey: session.licenseKey,
      deviceType: getDeviceType() as PresenceSelf["deviceType"],
      isAdmin: session.isAdmin,
      isTester: session.isTester,
      packageTier: session.packageTier,
    };

    const dispose = joinPresence(scopeCtx.scope, self, {
      currentSubject: getCurrentSubject(),
      hideStatus: settings?.hideStatus ?? false,
    });
    const unsub = subscribeLiveUsers(() => setUsers(getLiveUsers()));
    setUsers(getLiveUsers());

    const unJoin = onPresenceJoin((metas) => {
      const prev = prevKeysRef.current;
      const myKey = session.licenseKey.toUpperCase();
      for (const m of metas) {
        const k = (m.licenseKey || "").toUpperCase();
        if (!k || k === myKey) continue;
        if (prev.has(k)) continue;
        if (m.hideStatus) continue;
        const isVipOrAdmin =
          m.isAdmin || m.packageTier === "vip" || m.packageTier === "diamond";
        if (!isVipOrAdmin) continue;
        window.dispatchEvent(
          new CustomEvent("hs:vip-online", {
            detail: { licenseKey: m.licenseKey, name: m.userName, isAdmin: m.isAdmin },
          })
        );
      }
    });

    return () => {
      dispose();
      unsub();
      unJoin();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.licenseKey, settings?.hideStatus, scopeKey]);

  // Fallback poll (only matters when the realtime list is empty).
  useEffect(() => {
    const sc = scopeCtx?.scope;
    if (!sc) return;
    let cancelled = false;
    const run = () =>
      fetchOnlineUsers(sc)
        .then((d) => { if (!cancelled) setPolled(d); })
        .catch(() => {});
    run();
    const iv = setInterval(run, 120_000);
    return () => { cancelled = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  // Realtime is only considered working if it contains other users besides ourselves.
  const hasOthersOnRealtime = users.some((u) => u.licenseKey?.toUpperCase() !== session?.licenseKey?.toUpperCase());
  const effective = hasOthersOnRealtime ? users : (polled.length > 0 ? polled : users);

  // Keep the VIP baseline current from the latest list.
  useEffect(() => {
    prevKeysRef.current = new Set(
      effective.map((u) => u.licenseKey?.toUpperCase()).filter(Boolean) as string[]
    );
  }, [effective]);

  return { users: effective, refresh: () => {} };
}
