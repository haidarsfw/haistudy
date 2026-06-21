"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { CheatSheet } from "@/types/exam";
import { useTranslation } from "@/components/providers/language-provider";
import { isDismissedToday, dismissToday } from "@/lib/daily-dismiss";
import { ExamMarkdown } from "./exam-markdown";

interface Props {
  cheatSheet: CheatSheet;
  onClose: () => void;
}

type View = "web" | "pdf";

/**
 * In-exam cheat sheet viewer (Ops Mgmt). Right-side drawer on desktop,
 * full-screen on mobile. Two views: a cleaned-up web (KaTeX) version and the
 * original PDF rendered as image sheets (toggle). Reference only — never edited.
 */
export function ExamCheatSheet({ cheatSheet, onClose }: Props) {
  const { t } = useTranslation();
  const sheets = cheatSheet.sheets;
  const images = cheatSheet.imageSheets ?? [];
  const hasPdf = images.length > 0;
  const total = sheets.length;

  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View>("web");
  const [zoom, setZoom] = useState(1);
  const [showIntro, setShowIntro] = useState(
    () => !isDismissedToday("exam-cheatsheet-intro")
  );

  const sheet = sheets[index];
  const go = (i: number) => setIndex(Math.max(0, Math.min(total - 1, i)));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex justify-end"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t("exam.cheatsheet_close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        tabIndex={-1}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 38 }}
        className="relative z-10 flex h-full w-full flex-col border-l border-border bg-card shadow-2xl sm:w-[500px]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <BookMarked className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-bold text-foreground">
              {t("exam.cheatsheet_title")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Web / PDF toggle */}
            {hasPdf && (
              <div className="flex rounded-lg border border-border p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setView("web")}
                  className={`hs-press rounded-md px-2 py-1 transition-colors ${
                    view === "web" ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}
                >
                  {t("exam.cheatsheet_view_web")}
                </button>
                <button
                  type="button"
                  onClick={() => setView("pdf")}
                  className={`hs-press rounded-md px-2 py-1 transition-colors ${
                    view === "pdf" ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}
                >
                  {t("exam.cheatsheet_view_pdf")}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("exam.cheatsheet_close")}
              className="hs-press flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Intro hint (web only; dismiss = hidden for the rest of the day) */}
        {view === "web" && showIntro && (
          <div className="flex shrink-0 items-start gap-2 border-b border-border bg-muted/30 px-4 py-2">
            <p className="flex-1 text-[11px] leading-snug text-muted-foreground">
              {t("exam.cheatsheet_intro")}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowIntro(false);
                dismissToday("exam-cheatsheet-intro");
              }}
              aria-label={t("exam.cheatsheet_close")}
              className="hs-press shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Sheet selector — section names for the web view, plain page numbers
            for the PDF view (PDF pages are not the web sections). */}
        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-3 py-2">
          {sheets.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              className={`hs-press shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                i === index
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
              title={view === "pdf" ? `${t("exam.cheatsheet_sheet")} ${i + 1}` : s.title}
            >
              {view === "pdf"
                ? `${t("exam.cheatsheet_sheet")} ${i + 1}`
                : `${i + 1}. ${s.title.replace(/^\d+\.\s*/, "")}`}
            </button>
          ))}
        </div>

        {/* Content */}
        {view === "web" ? (
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            <h2 className="mb-4 border-b border-border pb-2 text-base font-black tracking-tight text-foreground">
              {sheet.title}
            </h2>
            <ExamMarkdown
              content={sheet.contentMd.replace(/^###\s.*\n/, "")}
              className={
                "leading-relaxed " +
                // generous rhythm so sections + formulas don't feel stacked
                "[&_h3]:mt-6 [&_h3]:mb-1.5 [&_h3]:text-[13px] [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-primary/80 first:[&_h3]:mt-0 " +
                "[&_p]:my-2 [&_strong]:text-foreground " +
                "[&_ul]:my-2 [&_ul]:space-y-1 [&_li]:my-0.5 [&_li]:leading-relaxed " +
                // formula blocks: roomy, boxed, never crammed together
                "[&_.katex-display]:my-4 [&_.katex-display]:rounded-lg [&_.katex-display]:border [&_.katex-display]:border-border [&_.katex-display]:bg-muted/40 [&_.katex-display]:px-4 [&_.katex-display]:py-3"
              }
            />
          </div>
        ) : (
          <div className="relative flex-1 overflow-auto overscroll-contain bg-muted/30 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[index]}
              alt={`${t("exam.cheatsheet_sheet")} ${index + 1}`}
              style={{ width: `${zoom * 100}%` }}
              className="mx-auto h-auto max-w-none rounded-md border border-border bg-white shadow-sm"
            />
            {/* Zoom controls */}
            <div className="sticky bottom-2 left-0 mt-2 flex justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100))}
                className="hs-press flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur"
                aria-label="zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="flex h-8 items-center rounded-full border border-border bg-card/90 px-2 text-xs font-semibold tabular-nums text-muted-foreground shadow-sm backdrop-blur">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
                className="hs-press flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur"
                aria-label="zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-2.5">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="hs-press flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("exam.scratchpad_prev_page")}
          </button>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {t("exam.cheatsheet_sheet")} {index + 1}/{total}
          </span>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === total - 1}
            className="hs-press flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground disabled:opacity-30"
          >
            {t("exam.scratchpad_next_page")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
