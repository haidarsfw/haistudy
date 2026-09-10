"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { NAV, easeEnter, easeExit, easeSize } from "@/lib/motion";

/**
 * A card that arrives closed.
 *
 * For the two things on /account that are tall and rarely wanted: changing a
 * password and closing an account. Both used to render at full height the
 * moment their page opened, which put a five-field form and a red warning panel
 * in front of someone who came to check something else — and made the page
 * itself look like it was about that one thing.
 *
 * Closed, each is one row like every other card on the page, so the page reads
 * as a list of things you can do rather than one open form with leftovers
 * around it. The hint line is not decoration: it carries the consequence, so
 * the cost of opening is known before it is paid.
 *
 * Height is animated here, which the navigation contract in `lib/motion`
 * otherwise forbids. A disclosure has no honest alternative — `scaleY` would
 * stretch the text inside it, and a crossfade at fixed height would need the
 * height it is trying to avoid. It is two cards on a page with no scroll
 * pressure, not a hot path.
 */
export function DisclosureCard({
  title,
  hint,
  icon,
  tone = "default",
  defaultOpen = false,
  children,
}: {
  title: string;
  /** What opening this leads to. Shown while closed and after opening. */
  hint: string;
  icon?: React.ReactNode;
  tone?: "default" | "danger";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduced = useReducedMotion();
  const bodyId = useId();

  const danger = tone === "danger";

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors ${
        danger
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-card"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className={`flex w-full items-start gap-3 p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
          danger
            ? "hover:bg-destructive/5 focus-visible:ring-destructive/40"
            : "hover:bg-muted/40 focus-visible:ring-primary/40"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {icon}
            {title}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
            {hint}
          </span>
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{
            duration: reduced ? NAV.reduced : NAV.enter,
            ease: easeEnter,
          }}
          className="mt-0.5 shrink-0 text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      {/* `initial={false}` so a card that starts open does not animate itself
          in on first paint — an opening animation nobody asked for reads as a
          glitch, not as polish. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: {
                duration: reduced ? NAV.reduced : 0.26,
                // `easeSize`, never `easeEnter`. The house curve overshoots by
                // design, and a height that overshoots grows past the content
                // then snaps back — the jolt that made this card read as broken.
                ease: open ? easeSize : easeExit,
              },
              // Opacity trails the height slightly on the way in and leads it
              // on the way out, so the content is never readable at a height
              // that is still moving.
              opacity: { duration: reduced ? NAV.reduced : 0.18 },
            }}
            style={{ overflow: "hidden" }}
          >
            <div
              className={`border-t px-5 pb-5 pt-4 ${
                danger ? "border-destructive/20" : "border-border/60"
              }`}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
