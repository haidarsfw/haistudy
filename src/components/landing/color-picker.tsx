"use client";

import { useState, useRef, useEffect } from "react";
import { THEMES } from "@/lib/constants";
import { useTheme } from "@/components/providers/theme-provider";
import { sounds } from "@/lib/sounds";

export function LandingColorPicker() {
  const { theme, setTheme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click (mobile)
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  const activeTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div
      ref={containerRef}
      className="relative flex items-center"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Active color button (always visible) */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="h-[18px] w-[18px] rounded-full ring-2 ring-white/70 shadow-[0_0_6px_var(--primary)] transition-all cursor-pointer"
        style={{ backgroundColor: activeTheme.color }}
        aria-label="Change theme color"
        suppressHydrationWarning
      />

      {/* Expanded swatches - instant show/hide, no animation */}
      {expanded && (
        <div className="flex items-center gap-1.5 ml-1.5">
          {THEMES.filter((t) => t.id !== theme).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                sounds.click();
                setTheme(t.id);
                setExpanded(false);
              }}
              className="h-4 w-4 rounded-full aspect-square ring-1 ring-white/20 hover:ring-white/40 hover:scale-105 transition-all duration-150 shrink-0 cursor-pointer"
              style={{ backgroundColor: t.color }}
              aria-label={`${t.name} theme`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
