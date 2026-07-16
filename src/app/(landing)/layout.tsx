import type { Viewport } from "next";
import { LandingShell } from "@/components/landing/landing-shell";

// Landing restores accessible pinch-zoom (WCAG 1.4.4 / Lighthouse a11y). The root
// layout locks zoom (maximumScale:1, userScalable:false) to stop iOS Safari from
// auto-zooming on the app's sub-16px inputs; the landing has no such inputs, so it
// overrides the viewport for its own routes only — the app stays locked.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

// Landing surface. LandingShell owns the `.landing-root` scope (teal brand
// tokens, system-following theme + manual toggle) plus Lenis smooth scroll and
// scroll-reveal. The app's own theme system is untouched.
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LandingShell>{children}</LandingShell>;
}
