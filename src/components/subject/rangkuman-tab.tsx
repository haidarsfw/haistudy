"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, BookOpen } from "lucide-react";
import { parseRangkuman } from "@/lib/content-parser";
import { getRangkumanBySubjectId } from "@/data/rangkuman";
import { useTheme } from "@/components/providers/theme-provider";
import { useTranslation } from "@/components/providers/language-provider";

type ReadingMode = "light" | "dark" | "sepia";

interface RangkumanTabProps {
  subjectId: string;
}

export function RangkumanTab({ subjectId }: RangkumanTabProps) {
  const { dark } = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<ReadingMode>(() => dark ? "dark" : "light");
  const [manualOverride, setManualOverride] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const rangkumanData = getRangkumanBySubjectId(subjectId);
  const modules = rangkumanData ? Object.keys(rangkumanData) : [];

  // Follow global theme unless manually overridden
  useEffect(() => {
    if (!manualOverride) {
      setMode(dark ? "dark" : "light");
    }
  }, [dark, manualOverride]);

  // Set first module as default
  useEffect(() => {
    if (modules.length > 0 && !selectedModule) {
      setSelectedModule(modules[0]);
    }
  }, [modules, selectedModule]);

  // Block copy/paste on rangkuman content
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "u", "p", "s"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (!rangkumanData || modules.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("rangkuman.not_available")}
      </p>
    );
  }

  const modeStyles = {
    light: "bg-white text-zinc-900",
    dark: "bg-zinc-900 text-zinc-100",
    sepia: "bg-[#f4ecd8] text-[#5b4636]",
  };

  const handleModeChange = (newMode: ReadingMode) => {
    setManualOverride(true);
    setMode(newMode);
  };

  return (
    <div className="flex flex-col gap-3 py-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Module selector */}
        <div className="flex gap-1 overflow-x-auto scrollbar-thin">
          {modules.map((mod) => (
            <button
              key={mod}
              onClick={() => setSelectedModule(mod)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedModule === mod
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {mod}
            </button>
          ))}
        </div>

        {/* Reading mode */}
        <div className="flex gap-1 shrink-0 ml-2">
          <button
            onClick={() => handleModeChange("light")}
            className={`rounded-md p-1.5 ${mode === "light" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleModeChange("dark")}
            className={`rounded-md p-1.5 ${mode === "dark" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleModeChange("sepia")}
            className={`rounded-md p-1.5 ${mode === "sepia" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
          >
            <BookOpen className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedModule && rangkumanData[selectedModule] && (
        <div
          className={`copy-protected rounded-xl border border-border p-5 ${modeStyles[mode]}`}
          onContextMenu={(e) => e.preventDefault()}
        >
          {parseRangkuman(rangkumanData[selectedModule])}
        </div>
      )}
    </div>
  );
}
