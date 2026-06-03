"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";

// Respect the OS-level "Reduce motion" accessibility preference.
// With reducedMotion="user", Framer Motion automatically replaces
// transform/position animations with instant state changes while preserving
// opacity fades - matches the WCAG 2.3.3 guidance.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  // base-ui ScrollArea (≤1.3.0) calls `thumb.releasePointerCapture(id)`
  // unconditionally on the scrollbar thumb's pointerup (ScrollAreaRoot). On a
  // touch device a preceding `pointercancel` already released the pointer, so
  // the call throws "NotFoundError: No active pointer with the given id". Guard
  // it globally: only release when this element actually holds the capture.
  // setPointerCapture is untouched, and Framer's drags (which release while
  // still captured) are unaffected — this only no-ops the stray release.
  useEffect(() => {
    const ep = Element.prototype as Element & { __hsPointerGuard?: boolean };
    if (ep.__hsPointerGuard) return;
    ep.__hsPointerGuard = true;
    const original = Element.prototype.releasePointerCapture;
    Element.prototype.releasePointerCapture = function (
      this: Element,
      pointerId: number
    ) {
      try {
        if (this.hasPointerCapture(pointerId)) original.call(this, pointerId);
      } catch {
        /* pointer already gone (touch pointercancel race) — ignore */
      }
    };
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
