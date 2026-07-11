import { BrowserWindow } from "@/components/landing/browser-window";
import { LogoMark } from "@/components/landing/logo";

// Placeholder for the hero product window. Neutral app-skeleton (no fake/
// inaccurate content) until the real, cursor-driven walkthrough is built.
export function HeroPreview() {
  return (
    <BrowserWindow url="haistudy.site">
      <div className="flex h-[380px] bg-background sm:h-[460px]">
        {/* sidebar skeleton */}
        <aside className="hidden w-[172px] shrink-0 flex-col border-r border-border/70 bg-card/40 p-4 sm:flex">
          <div className="mb-5 flex items-center gap-2">
            <LogoMark size={20} />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-lg bg-muted/70"
                style={{ width: `${92 - i * 6}%` }}
              />
            ))}
          </div>
        </aside>

        {/* content skeleton */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <div className="space-y-2">
            <div className="h-5 w-44 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted/60" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl border border-border bg-card"
              />
            ))}
          </div>
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        </div>
      </div>
    </BrowserWindow>
  );
}
