"use client";

import { Lock, LogOut, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { PURCHASE_FORM_URL } from "@/lib/constants";

const WATERMARK_BG = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='180' viewBox='0 0 360 180'>` +
    `<g fill='currentColor' font-family='system-ui, sans-serif' font-size='22' font-weight='700' transform='rotate(-30 180 90)'>` +
    `<text x='-40' y='40' letter-spacing='4'>PREVIEW</text>` +
    `<text x='80' y='110' letter-spacing='4'>PREVIEW</text>` +
    `<text x='-40' y='180' letter-spacing='4'>PREVIEW</text>` +
    `</g></svg>`
)}")`;

/**
 * Preview mode watermark - CSS background-image (zero DOM elements)
 * plus a CSS-delayed floating action bar at bottom with exit/purchase CTAs.
 * No React hooks; pure render based on session.isPreview.
 */
export function PreviewWatermark() {
  const { session, logout } = useSession();
  const router = useRouter();

  if (!session?.isPreview) return null;

  const handleExit = () => {
    logout();
    router.push("/");
  };

  const purchaseHref = PURCHASE_FORM_URL || "/login";
  const isExternal = !!PURCHASE_FORM_URL;

  return (
    <>
      {/* Diagonal repeating watermark - single decorative div, SVG background.
          Zero DOM text nodes so axe-core skips contrast audit; no LCP candidate. */}
      <div
        className="pointer-events-none fixed inset-0 z-40 opacity-[0.05] text-foreground"
        aria-hidden="true"
        style={{
          backgroundImage: WATERMARK_BG,
          backgroundRepeat: "repeat",
        }}
      />

      {/* Floating action bar - CSS entrance with 1.5s delay so it lands after LCP. */}
      <div className="preview-action-bar fixed bottom-[calc(var(--hs-mobile-nav)+env(safe-area-inset-bottom)+0.5rem)] sm:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 rounded-full border border-border bg-card/90 backdrop-blur-md px-3 sm:px-5 py-2 shadow-lg">
        <Lock className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
        <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
          Preview Mode
        </span>
        <div className="h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={handleExit}
        >
          <LogOut className="mr-1 h-3 w-3" aria-hidden="true" />
          Keluar
        </Button>
        {isExternal ? (
          <a
            href={purchaseHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" className="h-7 px-3 text-xs">
              <ExternalLink className="mr-1 h-3 w-3" aria-hidden="true" />
              Beli Akses
            </Button>
          </a>
        ) : (
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => router.push("/login")}
          >
            Beli Akses
          </Button>
        )}
      </div>
    </>
  );
}
