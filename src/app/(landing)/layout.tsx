import { LandingShell } from "@/components/landing/landing-shell";

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
