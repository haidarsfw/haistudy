import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Lock,
  Star,
  MoreVertical,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Realistic browser-window chrome used to frame the hero product showcase.
 * Traffic lights + nav controls + URL bar make it read as a real browser
 * (per brief) without copying any one reference.
 */
export function BrowserWindow({
  url = "haistudy.site",
  children,
  className,
}: {
  url?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 ring-1 ring-black/[0.03]",
        className
      )}
    >
      {/* chrome */}
      <div className="flex items-center gap-2.5 border-b border-border/70 bg-muted/40 px-3 py-2.5 sm:gap-3">
        <span className="flex shrink-0 gap-1.5 pl-1" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </span>
        <span
          className="hidden items-center gap-2 text-muted-foreground/60 sm:flex"
          aria-hidden="true"
        >
          <ChevronLeft className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <RotateCw className="h-3.5 w-3.5" />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0 text-primary/70" />
          <span className="truncate">{url}</span>
        </span>
        <span
          className="hidden items-center gap-2 text-muted-foreground/50 sm:flex"
          aria-hidden="true"
        >
          <Star className="h-4 w-4" />
          <MoreVertical className="h-4 w-4" />
        </span>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground/70"
          aria-hidden="true"
        >
          <User className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
