"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";
import { useSettings } from "@/hooks/use-settings";
import { getDeviceId, getDeviceType } from "@/lib/auth/device";
import { setupPresence, updateHideStatus } from "@/lib/presence";

/**
 * Sets up presence tracking for the current user.
 *
 * CRITICAL FIX: hideStatus is passed via a module-level setter
 * (updateHideStatus) instead of being a dependency of the setup effect.
 * This prevents the entire presence system from restarting every time
 * settings change — which was the root cause of inaccurate time tracking.
 *
 * The setup effect only re-runs on login/logout (session.licenseKey change).
 */
export function usePresence() {
  const { session } = useSession();
  const { settings } = useSettings();
  const cleanupRef = useRef<(() => void) | null>(null);

  // Update hideStatus WITHOUT restarting the presence system
  useEffect(() => {
    updateHideStatus(settings?.hideStatus ?? false);
  }, [settings?.hideStatus]);

  // Setup presence — ONLY restart on login/logout
  useEffect(() => {
    if (!session) return;

    const deviceId = getDeviceId();
    const deviceType = getDeviceType();

    setupPresence({
      userId: deviceId,
      userName: session.name,
      licenseKey: session.licenseKey,
      deviceType,
      hideStatus: settings?.hideStatus ?? false,
    }).then((cleanup) => {
      cleanupRef.current = cleanup;
    });

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.licenseKey]);
}
