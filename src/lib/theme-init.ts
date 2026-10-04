// ============================================
// Pre-hydration theme init
// ============================================
// Single source for the inline <script> that layout.tsx injects into <head>.
// It runs synchronously before React hydrates so there is no flash of the
// wrong theme / font / accent. The font stacks come straight from
// src/lib/fonts.ts; keep the accent formula in sync with accentToCss() below.

import type { CustomAccent } from "@/types";
import { FONT_STACK } from "@/lib/fonts";

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

// Inline IIFE. Mirrors accentToCss(). A stored font id that is not a key of
// FONT_STACK (the pre-October "jakarta" default, the oldest "geist") is left
// alone, which is the new default, exactly as normalizeFontId() reads it.
export const THEME_INIT_SCRIPT = `(function(){try{var r=document.documentElement;var d=JSON.parse(localStorage.getItem("dark"));if(d===false)r.classList.remove("dark");else r.classList.add("dark");var t=JSON.parse(localStorage.getItem("theme"));if(t)r.setAttribute("data-theme",t);var f=JSON.parse(localStorage.getItem("font"));var m=${JSON.stringify(FONT_STACK)};if(typeof f==="string"&&f!=="default"&&Object.prototype.hasOwnProperty.call(m,f)){r.setAttribute("data-font",f);r.style.setProperty("--font-sans",m[f])}var a=JSON.parse(localStorage.getItem("customAccent"));if(a&&typeof a.h==="number"){r.style.setProperty("--primary","hsl("+a.h+" "+a.s+"% "+a.l+"%)");r.style.setProperty("--primary-foreground",a.l>=60?"hsl(0 0% 12%)":"hsl(0 0% 98%)")}}catch(e){}})()`;
