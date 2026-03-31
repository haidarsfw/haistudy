"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";
import { useSettings } from "@/hooks/use-settings";
import { getDeviceId, getDeviceType } from "@/lib/auth/device";
import { setupPresence } from "@/lib/presence";

/**
 * Sets up presence tracking for the current user.
 * Automatically handles heartbeat and cleanup.
 */
export function usePresence() {
  const { session } = useSession();
  const { settings } = useSettings();
  const cleanupRef = useRef<(() => void) | null>(null);

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
    };
  }, [session, settings?.hideStatus]);
}
