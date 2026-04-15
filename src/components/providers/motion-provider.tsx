"use client";

import { MotionConfig } from "framer-motion";

// Respect the OS-level "Reduce motion" accessibility preference.
// With reducedMotion="user", Framer Motion automatically replaces
// transform/position animations with instant state changes while preserving
// opacity fades — matches the WCAG 2.3.3 guidance.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
