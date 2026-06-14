"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Sun,
  Moon,
  BookOpen,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  Headphones,
  Eraser,
} from "lucide-react";
import { parseRangkuman } from "@/lib/content-parser";
import { loadRangkuman } from "@/data";
import { useScope } from "@/components/providers/scope-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { useHighlights } from "@/hooks/use-highlights";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { canUseVipFeatures } from "@/lib/tier";
import {
  HighlightTooltip,
  computeSelectionAnchor,
  applyHighlightsToDOM,
} from "./highlight-tooltip";
import { TTSController } from "./tts-controller";
import { toast } from "@/components/ui/toast";
import { openAiWithReference } from "@/lib/events";
import type { HighlightColor, SnippetLibraryItem } from "@/types";

type ReadingMode = "light" | "dark" | "sepia";

interface RangkumanTabProps {
  subjectId: string;
  initialModule?: string;
  highlightText?: string;
}

export function RangkumanTab({
  subjectId,
  initialModule,
  highlightText,
}: RangkumanTabProps) {
  const { dark } = useTheme();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<ReadingMode>(() =>
    dark ? "dark" : "light"
  );
  const [manualOverride, setManualOverride] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(
    initialModule || null
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [ttsActive, setTtsActive] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const fullscreenContentRef = useRef<HTMLDivElement>(null);

  // Session + VIP gate for highlight colors / anti-copy bypass
  const { session } = useSession();
  const canVip = canUseVipFeatures(session);
  const isAdmin = session?.isAdmin ?? false;

  // Highlight state
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [tooltipMode, setTooltipMode] = useState<"create" | "manage">("create");
  const [pendingAnchor, setPendingAnchor] = useState<{
    text: string;
    ttsLine: number;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [managedHighlightId, setManagedHighlightId] = useState<string | null>(null);
  // VIP snippet library: the caller's saved snippets, used to detect when the
  // current selection is already a snippet (→ show a remove button).
  const [snippets, setSnippets] = useState<SnippetLibraryItem[]>([]);
  const [matchedSnippetId, setMatchedSnippetId] = useState<string | null>(null);

  // Detect TTS support after mount (SSR-safe).
  useEffect(() => {
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const { scope, scopeKey } = useScope();
  const [rangkumanData, setRangkumanData] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadRangkuman(scope, subjectId).then((data) => {
      if (!cancelled) setRangkumanData((data as Record<string, string>) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [scope, subjectId]);
  const modules = rangkumanData ? Object.keys(rangkumanData) : [];

  const { highlights, addHighlight, removeHighlight, clearAll } = useHighlights(
    scopeKey,
    subjectId,
    selectedModule
  );

  // Load the caller's snippets for this subject (VIP only) so we can detect
  // when a selection is already saved and offer a one-click remove.
  const fetchSnippets = useCallback(async () => {
    if (!canVip) return;
    try {
      const res = await fetch("/api/snippets");
      if (!res.ok) return;
      const data = await res.json();
      setSnippets(Array.isArray(data.snippets) ? data.snippets : []);
    } catch {
      /* non-fatal: remove-snippet affordance just won't show */
    }
  }, [canVip]);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  // Re-apply stored highlights to the DOM whenever highlights list or
  // selected module changes. Uses requestAnimationFrame so it runs after
  // React has painted the new content.
  const onClickHighlight = useCallback((id: string) => {
    // Find the highlight's mark element to position the tooltip.
    const mark = contentRef.current?.querySelector<HTMLElement>(
      `mark[data-hl-id="${id}"]`
    );
    if (mark) {
      const rect = mark.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      setTooltipMode("manage");
      setManagedHighlightId(id);
    }
  }, []);

  useEffect(() => {
    if (!contentRef.current || !selectedModule) return;
    const frame = requestAnimationFrame(() => {
      if (contentRef.current) {
        applyHighlightsToDOM(contentRef.current, highlights, onClickHighlight);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [highlights, selectedModule, onClickHighlight]);

  // Show tooltip on mouseup/touchend when there's a text selection.
  const handleSelectionEnd = useCallback(() => {
    if (!contentRef.current) return;
    const anchor = computeSelectionAnchor(contentRef.current);
    if (anchor) {
      setPendingAnchor({
        text: anchor.text,
        ttsLine: anchor.ttsLine,
        startOffset: anchor.startOffset,
        endOffset: anchor.endOffset,
      });
      setTooltipPos({ x: anchor.rect.left + anchor.rect.width / 2, y: anchor.rect.top });
      setTooltipMode("create");
      setManagedHighlightId(null);
      // Is this exact selection already saved as a snippet for this module?
      const norm = anchor.text.trim();
      const match = snippets.find(
        (s) =>
          s.subjectId === subjectId &&
          s.sourceModule === selectedModule &&
          s.snippetText.trim() === norm
      );
      setMatchedSnippetId(match?.id ?? null);
    }
  }, [snippets, subjectId, selectedModule]);

  // Dismiss tooltip on outside click or scroll.
  useEffect(() => {
    if (!tooltipPos) return;
    const dismiss = () => {
      setTooltipPos(null);
      setPendingAnchor(null);
      setManagedHighlightId(null);
      setMatchedSnippetId(null);
    };
    const onScroll = () => dismiss();
    const onClick = (e: MouseEvent) => {
      // Don't dismiss if clicking inside the tooltip itself.
      const el = e.target as HTMLElement;
      if (el.closest?.("[data-hl-tooltip]")) return;
      dismiss();
    };
    document.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onClick, true);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", onClick, true);
    };
  }, [tooltipPos]);

  // Mobile: iOS selection handles don't reliably fire touchend on the content,
  // so also surface the bottom action bar whenever the selection changes.
  useEffect(() => {
    if (!isMobile) return;
    let raf = 0;
    const onSel = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => handleSelectionEnd());
    };
    document.addEventListener("selectionchange", onSel);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("selectionchange", onSel);
    };
  }, [isMobile, handleSelectionEnd]);

  // Save highlight + optional save-to-library.
  const handlePickColor = useCallback(
    (color: HighlightColor) => {
      if (!canVip && color !== "yellow") {
        toast.info(t("highlight.color_locked"));
        return;
      }
      if (!pendingAnchor) return;
      // Highlight persists silently via useHighlights (survives reload). No
      // toast - the stabilo mark appearing IS the confirmation. (Snippet
      // save-to-library still toasts; that's a distinct, explicit action.)
      addHighlight({ ...pendingAnchor, color });
      setTooltipPos(null);
      setPendingAnchor(null);
      window.getSelection()?.removeAllRanges();
    },
    [canVip, pendingAnchor, addHighlight, t]
  );

  const handleSaveToLibrary = useCallback(async () => {
    const text = pendingAnchor?.text
      ?? (managedHighlightId
        ? highlights.find((h) => h.id === managedHighlightId)?.text
        : null);
    if (!text) return;
    if (!canVip) {
      toast.info(t("library.vip_only"));
      return;
    }
    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snippetText: text,
          subjectId,
          sourceModule: selectedModule,
          color: managedHighlightId
            ? highlights.find((h) => h.id === managedHighlightId)?.color
            : "yellow",
        }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success(t("highlight.added_to_library"));
      // Refresh local snippet list so the remove affordance appears next time
      // this text is selected.
      fetchSnippets();
    } catch {
      toast.error(t("profile.save_error"));
    }
    setTooltipPos(null);
    setPendingAnchor(null);
    setManagedHighlightId(null);
    setMatchedSnippetId(null);
    window.getSelection()?.removeAllRanges();
  }, [pendingAnchor, managedHighlightId, highlights, canVip, subjectId, selectedModule, t, fetchSnippets]);

  // Remove the snippet that matches the current selection (issue 12).
  const handleRemoveSnippet = useCallback(async () => {
    if (!matchedSnippetId) return;
    const id = matchedSnippetId;
    // Optimistic: drop locally first so the UI updates immediately.
    setSnippets((prev) => prev.filter((s) => s.id !== id));
    setMatchedSnippetId(null);
    setTooltipPos(null);
    setPendingAnchor(null);
    window.getSelection()?.removeAllRanges();
    try {
      const res = await fetch(`/api/snippets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      toast.success(t("highlight.snippet_removed"));
    } catch {
      toast.error(t("profile.save_error"));
      fetchSnippets(); // resync on failure
    }
  }, [matchedSnippetId, t, fetchSnippets]);

  const handleRemoveHighlight = useCallback(() => {
    if (managedHighlightId) {
      removeHighlight(managedHighlightId);
    }
    setTooltipPos(null);
    setManagedHighlightId(null);
  }, [managedHighlightId, removeHighlight]);

  const handleClearHighlights = useCallback(() => {
    clearAll();
    setTooltipPos(null);
    setManagedHighlightId(null);
    toast.success(t("highlight.cleared_all"));
  }, [clearAll, t]);

  // Issue 10: "Tanya AI" - open the AI panel grounded in the selected text.
  const handleAskAI = useCallback(() => {
    const text =
      pendingAnchor?.text || window.getSelection()?.toString().trim() || "";
    if (!text) return;
    openAiWithReference({ text, subjectId });
    setTooltipPos(null);
    setPendingAnchor(null);
    window.getSelection()?.removeAllRanges();
  }, [pendingAnchor, subjectId]);

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

  // TTS now lives in a separate TTSController component that only mounts
  // when ttsActive=true. The body class + line-highlight + auto-close
  // logic moved into that component. Stop TTS automatically when the
  // selected module changes by unmounting via the key prop on
  // <TTSController> below.

  const handleStartTTS = useCallback(() => {
    if (!selectedModule || !rangkumanData?.[selectedModule]) return;
    if (!ttsSupported) {
      toast.error("Browser Anda tidak mendukung Text-to-Speech.");
      return;
    }
    setTtsActive(true);
  }, [selectedModule, rangkumanData, ttsSupported]);

  const handleCloseTTS = useCallback(() => {
    setTtsActive(false);
  }, []);

  // Highlight + scroll to matched text from search
  const applyHighlight = useCallback(() => {
    if (!highlightText || !contentRef.current) return;

    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT
    );

    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const idx =
        node.textContent
          ?.toLowerCase()
          .indexOf(highlightText.toLowerCase()) ?? -1;
      if (idx === -1) continue;

      const mark = document.createElement("mark");
      // Visible box + glow on the exact quoted text so a snippet jump lands
      // somewhere obvious. Ring + bg + shadow; faded out after 2s.
      mark.className =
        "rounded px-0.5 bg-primary/30 ring-2 ring-primary shadow-[0_0_0_4px_rgba(0,0,0,0)] transition-all duration-700";

      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + highlightText.length);
      range.surroundContents(mark);

      mark.scrollIntoView({ behavior: "smooth", block: "center" });

      // Fade out after 2 seconds, then unwrap the mark.
      setTimeout(() => {
        mark.className =
          "rounded px-0.5 bg-transparent ring-0 transition-all duration-700";
        setTimeout(() => {
          const parent = mark.parentNode;
          if (parent) {
            parent.replaceChild(
              document.createTextNode(mark.textContent || ""),
              mark
            );
            parent.normalize();
          }
        }, 800);
      }, 2000);

      break;
    }
  }, [highlightText]);

  useEffect(() => {
    if (highlightText && selectedModule) {
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

  // Anti-copy: block copy/cut/contextmenu/keyboard shortcuts for non-admin.
  // Admin bypass: admins can copy freely.
  useEffect(() => {
    if (isAdmin) return; // admin bypass

    const blockKeys = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "x", "u", "p", "s"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        toast.info(t("rangkuman.copy_blocked"));
      }
    };
    const blockCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      // Clear the payload so even a native context-menu "Copy" (which still
      // fires the copy event) yields an empty clipboard, not the selection.
      e.clipboardData?.setData("text/plain", "");
      toast.info(t("rangkuman.copy_blocked"));
    };
    const blockContext = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Attach to the content containers as well as the document so the handler
    // fires regardless of where the selection lives in the tree.
    const nodes: Array<Document | HTMLElement> = [document];
    if (contentRef.current) nodes.push(contentRef.current);
    if (fullscreenContentRef.current) nodes.push(fullscreenContentRef.current);

    document.addEventListener("keydown", blockKeys);
    for (const node of nodes) {
      node.addEventListener("copy", blockCopyCut as EventListener);
      node.addEventListener("cut", blockCopyCut as EventListener);
      node.addEventListener("contextmenu", blockContext as EventListener);
    }
    return () => {
      document.removeEventListener("keydown", blockKeys);
      for (const node of nodes) {
        node.removeEventListener("copy", blockCopyCut as EventListener);
        node.removeEventListener("cut", blockCopyCut as EventListener);
        node.removeEventListener("contextmenu", blockContext as EventListener);
      }
    };
  }, [isAdmin, t, fullscreen, selectedModule]);

  // Event delegation: click on any slide image to open lightbox.
  // MUST be declared BEFORE the conditional early return below - otherwise
  // hook count changes across renders (none on first render when data is
  // still loading, then one once data arrives) and React throws #310.
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    const img = (e.target as HTMLElement).closest("img");
    if (img?.src) setLightboxSrc(img.src);
  }, []);

  // React-level copy/cut guard bound directly to the content containers. Belt
  // and suspenders alongside the document-level listeners: empties the
  // clipboard payload so even a native menu "Copy" yields nothing. Admin is
  // wired to skip this handler entirely (can copy freely).
  const handleBlockCopy = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData("text/plain", "");
      toast.info(t("rangkuman.copy_blocked"));
    },
    [t]
  );

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

        {/* Reading mode + TTS + fullscreen */}
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

          {/* TTS button - uses state-based supported check (SSR safe) */}
          {ttsSupported && (
            <button
              onClick={ttsActive ? handleCloseTTS : handleStartTTS}
              className={`rounded-md p-1.5 transition-colors ${
                ttsActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={ttsActive ? "Stop TTS" : "Dengarkan Rangkuman"}
            >
              <Headphones className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={() => setFullscreen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>

          {highlights.length > 0 && (
            <button
              onClick={handleClearHighlights}
              className="rounded-md p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              title={t("highlight.clear_all")}
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {selectedModule && rangkumanData[selectedModule] ? (
        <div
          ref={contentRef}
          className={`rounded-xl border border-border p-5 ${modeStyles[mode]} [&_img]:cursor-zoom-in`}
          onContextMenu={isAdmin ? undefined : (e) => e.preventDefault()}
          onCopy={isAdmin ? undefined : handleBlockCopy}
          onCut={isAdmin ? undefined : handleBlockCopy}
          onClick={handleContentClick}
          onMouseUp={handleSelectionEnd}
          onTouchEnd={handleSelectionEnd}
        >
          {parseRangkuman(rangkumanData[selectedModule])}
        </div>
      ) : selectedModule ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("rangkuman.placeholder")}
          </p>
        </div>
      ) : null}

      {/* Highlight tooltip */}
      {tooltipPos && (
        <div data-hl-tooltip>
          <HighlightTooltip
            x={tooltipPos.x}
            y={tooltipPos.y}
            mode={tooltipMode}
            canVip={canVip}
            onPickColor={handlePickColor}
            onSaveToLibrary={handleSaveToLibrary}
            onRemove={handleRemoveHighlight}
            onRemoveSnippet={
              tooltipMode === "create" && matchedSnippetId
                ? handleRemoveSnippet
                : undefined
            }
            onAskAI={tooltipMode === "create" ? handleAskAI : undefined}
            variant={isMobile ? "bar" : "floating"}
          />
        </div>
      )}

      {/* TTS controller - mounts useTTS only when user activates. */}
      {ttsActive && selectedModule && rangkumanData[selectedModule] && (
        <TTSController
          key={selectedModule}
          content={rangkumanData[selectedModule]}
          contentRef={contentRef}
          fullscreenRef={fullscreenContentRef}
          onClose={handleCloseTTS}
        />
      )}

      {/* Fullscreen modal */}
      {fullscreen && selectedModule && rangkumanData[selectedModule] && (
        <div className="fixed inset-0 z-[100] flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setFullscreen(false)}
          />

          {/* Modal */}
          <div
            className={`relative z-10 flex flex-col h-full w-full ${modeStyles[mode]}`}
          >
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
                <span className="text-sm font-medium truncate max-w-[140px] sm:max-w-none">
                  {selectedModule}
                </span>
                <button
                  onClick={() => {
                    const idx = modules.indexOf(selectedModule);
                    if (idx < modules.length - 1)
                      setSelectedModule(modules[idx + 1]);
                  }}
                  disabled={
                    modules.indexOf(selectedModule) === modules.length - 1
                  }
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

                {/* TTS button in fullscreen */}
                {ttsSupported && (
                  <button
                    onClick={ttsActive ? handleCloseTTS : handleStartTTS}
                    className={`rounded-md p-1.5 transition-colors ${
                      ttsActive
                        ? "bg-primary/15 text-primary"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    title={ttsActive ? "Stop TTS" : "Dengarkan"}
                  >
                    <Headphones className="h-3.5 w-3.5" />
                  </button>
                )}

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
                <span className="text-[11px] font-medium tabular-nums w-8 text-center">
                  {zoom}%
                </span>
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
              ref={fullscreenContentRef}
              className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 md:px-16 lg:px-32 py-6 [&_img]:cursor-zoom-in"
              onContextMenu={isAdmin ? undefined : (e) => e.preventDefault()}
              onCopy={isAdmin ? undefined : handleBlockCopy}
              onCut={isAdmin ? undefined : handleBlockCopy}
              onClick={handleContentClick}
            >
              <div
                className="max-w-4xl mx-auto origin-top"
                style={{
                  transform: `scale(${zoom / 100})`,
                  width: `${10000 / zoom}%`,
                }}
              >
                {parseRangkuman(rangkumanData[selectedModule])}
              </div>
            </div>

            {/* TTS Player in fullscreen is rendered by the same controller mounted above; no separate render needed. */}
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
