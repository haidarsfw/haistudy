"use client";

import { useEffect, useState } from "react";
import { isStandalone } from "@/lib/pwa-version";

/**
 * Returns `true` when the app chrome (header / bottom dock) should hide.
 *
 * Drives the "hide on scroll down, reveal on scroll up" behaviour used to
 * reclaim vertical space on mobile (where the document/window scrolls). Always
 * reveals near the top. On desktop the window never scrolls (the inner <main>
 * does), so `window.scrollY` stays 0 → this always returns `false` and the
 * chrome stays put — desktop is unaffected.
 *
 * Disabled entirely in an installed PWA (display-mode: standalone): there's no
 * browser toolbar competing for space, so the header + dock stay pinned —
 * cleaner and more accessible. Auto-hide only kicks in inside a browser tab.
 */
export function useHideOnScroll({
  threshold = 8,
  topOffset = 16,
}: { threshold?: number; topOffset?: number } = {}): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Installed PWA → keep chrome pinned (no Safari toolbar to dodge).
    if (isStandalone()) {
      setHidden(false);
      return;
    }

    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = Math.max(0, window.scrollY);
      if (y <= topOffset) {
        setHidden(false); // always show near the top
      } else if (Math.abs(y - lastY) > threshold) {
        setHidden(y > lastY); // scrolling down → hide, up → reveal
      }
      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, topOffset]);

  return hidden;
}
