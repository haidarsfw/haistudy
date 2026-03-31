"use client";

import { motion } from "framer-motion";
import { Lock, LogOut, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { PURCHASE_FORM_URL } from "@/lib/constants";

/**
 * Preview mode watermark - subtle diagonal repeating text overlay
 * plus a floating action bar at bottom with exit/purchase CTAs.
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
      {/* Diagonal repeating watermark - covers entire viewport */}
      <div
        className="pointer-events-none fixed inset-0 z-40 overflow-hidden opacity-[0.04]"
        aria-hidden
      >
        <div
          className="absolute -inset-1/2 flex flex-wrap items-center justify-center gap-16 -rotate-45"
          style={{ width: "200%", height: "200%" }}
        >
          {Array.from({ length: 60 }).map((_, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-2xl font-bold uppercase tracking-widest text-foreground select-none"
            >
              PREVIEW
            </span>
          ))}
        </div>
      </div>

      {/* Floating action bar at bottom */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 24 }}
        className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] sm:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 rounded-full border border-border bg-card/90 backdrop-blur-md px-3 sm:px-5 py-2 shadow-lg"
      >
        <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
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
          <LogOut className="mr-1 h-3 w-3" />
          Keluar
        </Button>
        {isExternal ? (
          <a
            href={purchaseHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" className="h-7 px-3 text-xs">
              <ExternalLink className="mr-1 h-3 w-3" />
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
      </motion.div>
    </>
  );
}
