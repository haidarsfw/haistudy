"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";
import { useSettings } from "@/hooks/use-settings";
import { getDeviceId, getDeviceType } from "@/lib/auth/device";
import {
  setupPresence,
  updateCurrentSubject,
  updateHideStatus,
} from "@/lib/presence";
import { whenIdle } from "@/lib/defer";

/**
 * Sets up presence tracking for the current user.
 *
 * CRITICAL FIX: hideStatus + currentSubject pass via module-level setters
 * (updateHideStatus / updateCurrentSubject) instead of being deps of the
 * setup effect. Restarting the presence system on every nav or settings
 * change was the root cause of inaccurate time tracking.
 *
 * The setup effect only re-runs on login/logout (session.licenseKey change).
 */
export function usePresence(currentSubject: string | null = null) {
  const { session } = useSession();
  const { settings } = useSettings();
  const cleanupRef = useRef<(() => void) | null>(null);
  const currentSubjectRef = useRef(currentSubject);
  currentSubjectRef.current = currentSubject;

  useEffect(() => {
    updateHideStatus(settings?.hideStatus ?? false);
  }, [settings?.hideStatus]);

  useEffect(() => {
    updateCurrentSubject(currentSubject);
  }, [currentSubject]);

  useEffect(() => {
    if (!session) return;

    const cancelIdle = whenIdle(() => {
      const deviceId = getDeviceId();
      const deviceType = getDeviceType();

      setupPresence({
        userId: deviceId,
        userName: session.name,
        licenseKey: session.licenseKey,
        deviceType,
        hideStatus: settings?.hideStatus ?? false,
        currentSubject: currentSubjectRef.current,
      }).then((cleanup) => {
        cleanupRef.current = cleanup;
      });
    });

    return () => {
      cancelIdle();
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.licenseKey]);
}
