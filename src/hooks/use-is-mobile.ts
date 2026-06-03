"use client";

import { useEffect, useState } from "react";

/**
 * True when the viewport is below Tailwind's `sm` breakpoint (<640px).
 *
 * Intended for client-only / `ssr:false` component trees (e.g. the lazily
 * mounted chat + AI panels). The lazy initializer reads `matchMedia` on the
 * client so the very first paint already has the correct value — no flash of
 * the wrong slide-in direction. Guarded by `typeof window` so it stays inert
 * during SSR. The effect keeps it in sync on resize / orientation change.
 */
export function useIsMobile(query = "(max-width: 639px)"): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return isMobile;
}
