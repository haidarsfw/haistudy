// ============================================
// Lazy VIP font loader
// ============================================
// Free fonts (jakarta/inter/poppins) are bundled via next/font in layout.tsx.
// VIP fonts are fetched from Google Fonts ONLY when the user actually selects
// one, so the free-user critical path ships zero extra font bytes.

import type { FontId } from "@/types";
import { FONTS } from "@/lib/constants";

const loaded = new Set<FontId>();

const FAMILY_STACK: Partial<Record<FontId, string>> = {
  lora: '"Lora", Georgia, serif',
  jetbrains: '"JetBrains Mono", ui-monospace, monospace',
  quicksand: '"Quicksand", system-ui, sans-serif',
  merriweather: '"Merriweather", Georgia, serif',
  // System serif - no Google Fonts <link>; ensureFontLoaded() no-ops (no googleFamily).
  times: '"Times New Roman", Times, serif',
};

/** CSS font-family stack for a font id (used by theme provider / picker). */
export function fontFamilyStack(id: FontId): string {
  if (FAMILY_STACK[id]) return FAMILY_STACK[id]!;
  const map: Record<string, string> = {
    jakarta: "var(--font-heading), sans-serif",
    inter: "var(--font-body), sans-serif",
    poppins: "var(--font-poppins), sans-serif",
  };
  return map[id] || map.jakarta;
}

/**
 * Inject the Google Fonts stylesheet for a VIP font if not already present.
 * No-op for free fonts and on the server. Idempotent.
 */
export function ensureFontLoaded(id: FontId): void {
  if (typeof document === "undefined") return;
  if (loaded.has(id)) return;
  const opt = FONTS.find((f) => f.id === id);
  if (!opt?.vip || !opt.googleFamily) {
    loaded.add(id);
    return;
  }
  const linkId = `hs-font-${id}`;
  if (document.getElementById(linkId)) {
    loaded.add(id);
    return;
  }
  // Preconnect once for performance.
  if (!document.getElementById("hs-gfonts-preconnect")) {
    const pc = document.createElement("link");
    pc.id = "hs-gfonts-preconnect";
    pc.rel = "preconnect";
    pc.href = "https://fonts.gstatic.com";
    pc.crossOrigin = "anonymous";
    document.head.appendChild(pc);
  }
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${opt.googleFamily}&display=swap`;
  document.head.appendChild(link);
  loaded.add(id);
}
