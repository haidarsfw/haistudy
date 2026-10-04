// ============================================
// Fonts: one map for every face a user can pick
// ============================================
// Every face is self-hosted through next/font/local in src/app/layout.tsx, so
// nothing is fetched from Google at runtime. A face nobody uses is never
// downloaded: the browser fetches a woff2 only when text is set in it.
//
// Each @font-face carries a size-adjust so its lowercase letters stand as tall
// as Inter's (x-height 0.546 em). Picking another font changes the letter
// shapes, not the size, so nothing in the layout jumps. Values were measured
// from the shipped files on 2026-10-04; keep them with the files in layout.tsx.

import type { FontId } from "@/types";

/** font-family stack per font id. `default` is haistudy's own body face. */
export const FONT_STACK: Record<FontId, string> = {
  default: "var(--font-body), ui-sans-serif, system-ui, sans-serif",
  plusjakarta: "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif",
  inter: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  poppins: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
  lora: "var(--font-lora), Georgia, serif",
  jetbrains: "var(--font-jetbrains), ui-monospace, monospace",
  quicksand: "var(--font-quicksand), ui-sans-serif, system-ui, sans-serif",
  merriweather: "var(--font-merriweather), Georgia, serif",
  // Times New Roman is a system font; "HS Times" (globals.css) is the same
  // local file with the size-adjust the other faces get from next/font.
  times: '"HS Times", "Times New Roman", Times, serif',
};

/**
 * Settings saved before October 2026 hold "jakarta", the old default, for
 * almost everyone, so that value cannot tell a deliberate pick from no pick.
 * It now reads as the new default; Jakarta itself is offered again as
 * "plusjakarta". Anything unknown (the oldest rows say "geist") falls back too.
 */
export function normalizeFontId(value: unknown): FontId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(FONT_STACK, value)
    ? (value as FontId)
    : "default";
}

export function fontFamilyStack(id: FontId): string {
  return FONT_STACK[normalizeFontId(id)];
}
