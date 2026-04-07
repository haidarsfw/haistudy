"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useState, useEffect } from "react";

export function LandingThemeToggle() {
  const { dark, toggleDark } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={toggleDark}
      className="p-1.5 rounded-full hover:bg-muted/50 transition-colors cursor-pointer"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="flex items-center transition-transform duration-200">
        {!mounted ? (
          <span className="h-4 w-4" />
        ) : dark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}
