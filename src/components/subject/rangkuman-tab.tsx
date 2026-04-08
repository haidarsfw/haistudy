"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Sun, Moon, BookOpen, Maximize2, X, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from "lucide-react";
import { parseRangkuman } from "@/lib/content-parser";
import { getRangkumanBySubjectId } from "@/data/rangkuman";
import { useTheme } from "@/components/providers/theme-provider";
import { useTranslation } from "@/components/providers/language-provider";

type ReadingMode = "light" | "dark" | "sepia";

interface RangkumanTabProps {
  subjectId: string;
  initialModule?: string;
  highlightText?: string;
}

export function RangkumanTab({ subjectId, initialModule, highlightText }: RangkumanTabProps) {
  const { dark } = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<ReadingMode>(() => dark ? "dark" : "light");
  const [manualOverride, setManualOverride] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(initialModule || null);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100); // percentage, 100 = default
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
      setSelectedModule(initialModule || modules[0]);
    }
  }, [modules, selectedModule, initialModule]);

  // Highlight + scroll to matched text from search
  const applyHighlight = useCallback(() => {
    if (!highlightText || !contentRef.current) return;

    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
    );

    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const idx = node.textContent?.toLowerCase().indexOf(highlightText.toLowerCase()) ?? -1;
      if (idx === -1) continue;

      const mark = document.createElement("mark");
      mark.className = "bg-primary/30 rounded px-0.5 transition-colors duration-700";

      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + highlightText.length);
      range.surroundContents(mark);

      mark.scrollIntoView({ behavior: "smooth", block: "center" });

      // Fade out after 4 seconds
      setTimeout(() => {
        mark.className = "bg-transparent rounded px-0.5 transition-colors duration-700";
        setTimeout(() => {
          // Unwrap the mark element
          const parent = mark.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
            parent.normalize();
          }
        }, 800);
      }, 4000);

      break; // Only highlight first match
    }
  }, [highlightText]);

  useEffect(() => {
    if (highlightText && selectedModule) {
      // Wait for content to render
      const timer = setTimeout(applyHighlight, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightText, selectedModule, applyHighlight]);

  // Close fullscreen/lightbox on Escape + lock body scroll
  useEffect(() => {
    if (!fullscreen && !lightboxSrc) return;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxSrc) setLightboxSrc(null);
        else setFullscreen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [fullscreen, lightboxSrc]);

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

  // Event delegation: click on any slide image to open lightbox
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    const img = (e.target as HTMLElement).closest("img");
    if (img?.src) setLightboxSrc(img.src);
  }, []);

  return (
    <div className="flex flex-col gap-3 py-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Module selector */}
        <div className="flex gap-1 overflow-x-auto scrollbar-thin">
          {modules.map((mod) => {
            const shortLabel = mod.match(/^Modul\w*\s+\d+/i)?.[0] || mod;
            return (
              <button
                key={mod}
                onClick={() => setSelectedModule(mod)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedModule === mod
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{mod}</span>
              </button>
            );
          })}
        </div>

        {/* Reading mode + fullscreen */}
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
          <div className="w-px bg-border mx-0.5" />
          <button
            onClick={() => setFullscreen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedModule && rangkumanData[selectedModule] && (
        <div
          ref={contentRef}
          className={`copy-protected rounded-xl border border-border p-5 ${modeStyles[mode]} [&_img]:cursor-zoom-in`}
          onContextMenu={(e) => e.preventDefault()}
          onClick={handleContentClick}
        >
          {parseRangkuman(rangkumanData[selectedModule])}
        </div>
      )}

      {/* Fullscreen modal */}
      {fullscreen && selectedModule && rangkumanData[selectedModule] && (
        <div className="fixed inset-0 z-[100] flex flex-col">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFullscreen(false)} />

          {/* Modal */}
          <div className={`relative z-10 flex flex-col h-full w-full ${modeStyles[mode]}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-current/10 shrink-0">
              {/* Left: module nav */}
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  onClick={() => {
                    const idx = modules.indexOf(selectedModule);
                    if (idx > 0) setSelectedModule(modules[idx - 1]);
                  }}
                  disabled={modules.indexOf(selectedModule) === 0}
                  className="rounded-md p-1 hover:bg-current/10 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium truncate max-w-[140px] sm:max-w-none">{selectedModule}</span>
                <button
                  onClick={() => {
                    const idx = modules.indexOf(selectedModule);
                    if (idx < modules.length - 1) setSelectedModule(modules[idx + 1]);
                  }}
                  disabled={modules.indexOf(selectedModule) === modules.length - 1}
                  className="rounded-md p-1 hover:bg-current/10 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Center: controls */}
              <div className="flex items-center gap-1">
                {/* Reading mode */}
                <button
                  onClick={() => handleModeChange("light")}
                  className={`rounded-md p-1.5 transition-colors ${mode === "light" ? "bg-primary/15 text-primary" : "opacity-60 hover:opacity-100"}`}
                  title="Light"
                >
                  <Sun className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleModeChange("dark")}
                  className={`rounded-md p-1.5 transition-colors ${mode === "dark" ? "bg-primary/15 text-primary" : "opacity-60 hover:opacity-100"}`}
                  title="Dark"
                >
                  <Moon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleModeChange("sepia")}
                  className={`rounded-md p-1.5 transition-colors ${mode === "sepia" ? "bg-primary/15 text-primary" : "opacity-60 hover:opacity-100"}`}
                  title="Sepia"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                </button>

                <div className="w-px h-4 bg-current/15 mx-1" />

                {/* Zoom */}
                <button
                  onClick={() => setZoom((z) => Math.max(70, z - 10))}
                  disabled={zoom <= 70}
                  className="rounded-md p-1.5 hover:bg-current/10 disabled:opacity-30 transition-colors"
                  title="Perkecil"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-medium tabular-nums w-8 text-center">{zoom}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(150, z + 10))}
                  disabled={zoom >= 150}
                  className="rounded-md p-1.5 hover:bg-current/10 disabled:opacity-30 transition-colors"
                  title="Perbesar"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {zoom !== 100 && (
                  <button
                    onClick={() => setZoom(100)}
                    className="rounded-md p-1 hover:bg-current/10 transition-colors opacity-60 hover:opacity-100"
                    title="Reset zoom"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Right: close */}
              <button
                onClick={() => setFullscreen(false)}
                className="rounded-lg p-1.5 hover:bg-current/10 transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain copy-protected px-4 sm:px-8 md:px-16 lg:px-32 py-6 [&_img]:cursor-zoom-in"
              onContextMenu={(e) => e.preventDefault()}
              onClick={handleContentClick}
            >
              <div className="max-w-4xl mx-auto" style={{ zoom: zoom / 100 }}>
                {parseRangkuman(rangkumanData[selectedModule])}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide image lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxSrc}
            alt="Slide"
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
