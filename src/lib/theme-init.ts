// ============================================
// Pre-hydration theme init
// ============================================
// Single source for the inline <script> that layout.tsx injects into <head>.
// It runs synchronously before React hydrates so there is no flash of the
// wrong theme / font / accent. Keep the font family map and accent formula in
// sync with lazy-fonts.ts (fontFamilyStack) and accentToCss() below.

import type { CustomAccent } from "@/types";

/**
 * Derive the CSS values to apply for a custom VIP accent.
 * `--primary` is overridden inline on <html>, which beats the preset
 * `[data-theme=x]` rules. All derived effects that read
 * `oklch(from var(--primary) ...)` follow automatically.
 */
export function accentToCss(a: CustomAccent): {
  primary: string;
  foreground: string;
} {
  const primary = `hsl(${a.h} ${a.s}% ${a.l}%)`;
  // Pick a readable foreground from the accent lightness.
  const foreground = a.l >= 60 ? "hsl(0 0% 12%)" : "hsl(0 0% 98%)";
  return { primary, foreground };
}

// Inline IIFE. Mirrors accentToCss() + the font stacks in lazy-fonts.ts.
// VIP font stacks are set here too; the Google Fonts <link> is injected
// post-hydration by ensureFontLoaded(), so the browser falls back to the
// generic family (serif/monospace) for the first paint - no layout flash.
export const THEME_INIT_SCRIPT = `(function(){try{var r=document.documentElement;var d=JSON.parse(localStorage.getItem("dark"));if(d===false)r.classList.remove("dark");else r.classList.add("dark");var t=JSON.parse(localStorage.getItem("theme"));if(t)r.setAttribute("data-theme",t);var f=JSON.parse(localStorage.getItem("font"));if(f){r.setAttribute("data-font",f);var m={jakarta:"var(--font-heading), sans-serif",inter:"var(--font-body), sans-serif",poppins:"var(--font-poppins), sans-serif",lora:'"Lora", Georgia, serif',jetbrains:'"JetBrains Mono", ui-monospace, monospace',quicksand:'"Quicksand", system-ui, sans-serif',merriweather:'"Merriweather", Georgia, serif'};r.style.setProperty("--font-sans",m[f]||m.jakarta)}var a=JSON.parse(localStorage.getItem("customAccent"));if(a&&typeof a.h==="number"){r.style.setProperty("--primary","hsl("+a.h+" "+a.s+"% "+a.l+"%)");r.style.setProperty("--primary-foreground",a.l>=60?"hsl(0 0% 12%)":"hsl(0 0% 98%)")}}catch(e){}})()`;
