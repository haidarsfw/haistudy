"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

export function LandingThemeToggle() {
  const { toggleDark } = useTheme();

  // Both icons always in DOM — CSS dark: variant toggles visibility.
  // This avoids any hydration mismatch from conditional rendering.
  return (
    <button
      onClick={toggleDark}
      className="p-1.5 rounded-full hover:bg-muted/50 transition-colors cursor-pointer"
      aria-label="Toggle dark mode"
    >
      <span className="flex items-center transition-transform duration-200">
        <Sun className="h-4 w-4 hidden dark:block" />
        <Moon className="h-4 w-4 block dark:hidden" />
      </span>
    </button>
  );
}
