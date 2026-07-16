"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { FAQ } from "@/data/landing/faq";

// Same support entry as the header (dark-only landing, WhatsApp pre-sale line).
const WA_HELP =
  "https://wa.me/6287839256171?text=" +
  encodeURIComponent("Halo min, saya mau tanya soal haistudy");

/**
 * FAQ accordion — hairline list (Linear/Vercel/Stripe style): no cards, just
 * thin dividers, airy rhythm. Single-open; the answer slides open on a fluid
 * grid-rows transition (see `.faq-panel` in globals.css). A `+` rotates 45° into
 * an `×`. Fully keyboard-operable (real <button>, aria-expanded/controls).
 */
export function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="border-t border-border/60">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <ScrollReveal key={item.q} delay={i * 0.04}>
              <div className="border-b border-border/60">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="group flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
                      className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground sm:text-[15px]"
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
    </div>
  );
}
