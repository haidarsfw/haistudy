"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/components/providers/session-provider";

interface PreviewLockProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * Wraps content with a blur + lock overlay in preview mode.
 * Titles/headings remain visible, content is blurred with an upgrade CTA.
 */
export function PreviewLock({ children, title }: PreviewLockProps) {
  const { session } = useSession();

  if (!session?.isPreview) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-sm">{children}</div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-xl">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          {title && (
            <p className="text-sm font-medium">{title}</p>
          )}
          <p className="text-xs text-muted-foreground max-w-[240px]">
            Beli akses untuk melihat konten lengkap
          </p>
          <Link
            href="/login"
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Beli Akses
          </Link>
        </div>
      </div>
    </div>
  );
}
