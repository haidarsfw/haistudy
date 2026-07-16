"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { FAQ, type FaqItem } from "@/data/landing/faq";

// Same support entry as the header (dark-only landing, WhatsApp pre-sale line).
const WA_HELP =
  "https://wa.me/6287839256171?text=" +
  encodeURIComponent("Halo min, saya mau tanya soal haistudy");

/**
 * FAQ accordion — one card PER question (each on its own bg-card + border +
 * shadow surface, same as the demo / pricing cards, with a gap between). Single
 * open; the answer slides open on a fluid grid-rows transition (see `.faq-panel`
 * in globals.css). A `+` rotates 45° into an `×`. Fully keyboard-operable (real
 * <button>, aria-expanded/controls).
 *
 * Defaults to the landing FAQ + its WhatsApp nudge. Pass `items` to reuse the
 * accordion elsewhere (e.g. /refund) and `nudge` to swap or drop the footer CTA
 * (`nudge={null}` renders none).
 */
export function Faq({
  items = FAQ,
  nudge,
}: {
  items?: FaqItem[];
  nudge?: React.ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="space-y-3">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <ScrollReveal key={item.q} delay={i * 0.04}>
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-colors hover:border-primary/20">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                >
                  <span className="text-[15px] font-medium text-foreground sm:text-base">
                    {item.q}
                  </span>
                  <Plus
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:text-foreground ${
                      isOpen ? "rotate-45" : "rotate-0"
                    }`}
                  />
                </button>
                <div className="faq-panel" data-open={isOpen ? "true" : "false"}>
                  <div>
                    <p
                      id={`faq-panel-${i}`}
                      role="region"
                      className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground sm:text-[15px]"
                    >
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Soft support nudge — top-landing-FAQ pattern; routes to the same WA. */}
      {nudge === undefined ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Masih ada yang mau ditanyain?{" "}
          <a
            href={WA_HELP}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Chat admin
          </a>
        </p>
      ) : (
        nudge
      )}
    </div>
  );
}
