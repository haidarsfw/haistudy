"use client";

import { useCallback, useRef } from "react";

interface UseLongPressOptions {
  delay?: number;       // default 450ms
  movementCancel?: number; // px (default 8)
  haptic?: boolean;     // default true
}

interface PointerLikeEvent {
  pointerId?: number;
  clientX: number;
  clientY: number;
  preventDefault?: () => void;
}

/**
 * Generic long-press hook. Works with mouse + touch via pointer events.
 *  - Cancels if pointer moves more than `movementCancel` px.
 *  - Cancels if pointer released before `delay` elapses.
 *  - Fires `onLongPress(originEvent)` once when threshold reached.
 *  - Optionally vibrates briefly when fired.
 */
export function useLongPress(
  onLongPress: (e: PointerLikeEvent) => void,
  opts: UseLongPressOptions = {}
) {
  const { delay = 450, movementCancel = 8, haptic = true } = opts;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      cancel();
      firedRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      const ev: PointerLikeEvent = {
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
      };
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        if (haptic && typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(15);
          } catch {
            // ignore
          }
        }
        onLongPress(ev);
      }, delay);
    },
    [cancel, delay, haptic, onLongPress]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current || !timerRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (Math.hypot(dx, dy) > movementCancel) cancel();
    },
    [cancel, movementCancel]
  );

  const onPointerUp = useCallback(() => {
    cancel();
  }, [cancel]);

  const onPointerCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // On touch devices, long-press triggers contextmenu — suppress it if our
      // long-press handler already fired so we don't get the system menu.
      if (firedRef.current) {
        e.preventDefault();
      }
    },
    []
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onContextMenu,
  };
}
