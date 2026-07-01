"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  Download,
  Copy,
  Check,
  X,
  Eye,
} from "lucide-react";
import type { CheatsheetFull } from "@/types";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { toast } from "@/components/ui/toast";

interface Props {
  data: CheatsheetFull;
  /** True only while the Cheatsheet tab is the active one — gates keybinds so
   * Space/arrows don't hijack the page when another tab is showing. */
  active?: boolean;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const clampZoom = (z: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));

/**
 * Per-user identity watermark — the nickname and "haistudy" both tilted the
 * same -30° (facing up-right) but placed FAR APART within the tile (diagonal
 * offset), so when tiled they read as two separate, evenly-spread rows of text
 * rather than a stacked pair. Drawn OVER the page so it's captured in any
 * screenshot.
 */
function buildWatermark(name: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const a = esc(name);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='440' height='300'>` +
    `<g transform='rotate(-30 220 150)' fill='currentColor' font-family='system-ui, sans-serif' font-weight='700' font-size='15' letter-spacing='2'>` +
    `<text x='34' y='86'>${a}</text>` +
    `<text x='250' y='226' opacity='0.85'>haistudy</text>` +
    `</g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/**
 * Protected, view-only cheat-sheet viewer (Operations Management).
 *
 * Renders page IMAGES from the gated route `/api/cheatsheet/<subject>/<ver>/<page>`
 * (login + non-preview only). The served bytes already carry a baked-in generic
 * "haistudy" watermark; this viewer adds a per-user identity overlay on top.
 * Formatting is preserved exactly and there is no selectable text → nothing to
 * copy. Right-click / save / drag / copy / selection / print are blocked for
 * EVERYONE (no admin bypass — this content is sacred).
 *
 * Honest scope: screenshots can't be blocked by any website — the watermark is
 * what turns a capture into a traceable leak.
 */
export function CheatsheetViewer({ data, active = true }: Props) {
  const { t } = useTranslation();
  const { session } = useSession();

  const versions = data.versions;
  // Viewable versions = those with in-app WebP pages. Download-only versions
  // (e.g. the essay-theory PDF) are excluded from the viewer tabs/pages but
  // still appear in the download chooser below.
  const viewVersions = versions.filter((v) => !v.downloadOnly);
  const [verIdx, setVerIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const isAdmin = !!session?.isAdmin;
  const [access, setAccess] = useState<{ unlocked: boolean; password: string | null }>({
    unlocked: false,
    password: null,
  });
  const [popupOpen, setPopupOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false); // password hidden until clicked

  const ver = viewVersions[verIdx] ?? viewVersions[0];
  const total = ver?.pageCount ?? 0;
  const src = `/api/cheatsheet/${data.subject}/${ver?.id}/${page}`;

  // Watermark = nickname + haistudy (2 lines, no license key on screen).
  const watermark = useMemo(() => {
    const name = session?.shortName || session?.name || "haistudy";
    return buildWatermark(name);
  }, [session?.shortName, session?.name]);

  // New page image → show the loader until it paints. Scroll position is left
  // untouched on purpose (paging must not jerk back to the top).
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const goPage = useCallback(
    (n: number) => setPage((p) => Math.max(1, Math.min(total, n)) || p),
    [total]
  );
  const zoomBy = useCallback(
    (d: number) => setZoom((z) => clampZoom(z + d)),
    []
  );
  const switchVersion = useCallback((i: number) => {
    setVerIdx(i);
    setPage(1);
    setZoom(1);
  }, []);

  // Keyboard controls — only while this tab is active, and never while typing.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      switch (e.key) {
        case " ":
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          goPage(page + 1);
          break;
        case "p":
        case "P":
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          goPage(page - 1);
          break;
        case "+":
        case "=":
          e.preventDefault();
          zoomBy(ZOOM_STEP);
          break;
        case "-":
        case "_":
          e.preventDefault();
          zoomBy(-ZOOM_STEP);
          break;
        case "0":
          e.preventDefault();
          setZoom(1);
          break;
        case "Home":
          e.preventDefault();
          goPage(1);
          break;
        case "End":
          e.preventDefault();
          goPage(total);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, page, total, goPage, zoomBy]);

  // Ctrl/Cmd + wheel = zoom (native listener so preventDefault isn't passive).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !active) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [active]);

  // Download access (lock state + password) — fetched when the tab is active.
  const refreshAccess = useCallback(async () => {
    try {
      const res = await fetch(`/api/cheatsheet/${data.subject}/access`, {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const j = (await res.json()) as {
        downloadUnlocked?: boolean;
        password?: string | null;
      };
      setAccess({ unlocked: !!j.downloadUnlocked, password: j.password ?? null });
    } catch {
      /* leave as-is on network error */
    }
  }, [data.subject]);

  useEffect(() => {
    if (active) refreshAccess();
  }, [active, refreshAccess]);

  // Admin-only: flip the download lock for this subject.
  const toggleLock = useCallback(async () => {
    setToggling(true);
    try {
      const res = await fetch(`/api/cheatsheet/${data.subject}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !access.unlocked }),
        credentials: "same-origin",
      });
      if (res.ok) await refreshAccess();
      else toast.error(t("subject.cheatsheet_lock_failed"));
    } catch {
      toast.error(t("subject.cheatsheet_lock_failed"));
    } finally {
      setToggling(false);
    }
  }, [access.unlocked, data.subject, refreshAccess, t]);

  const copyPassword = useCallback(async () => {
    if (!access.password) return;
    try {
      await navigator.clipboard.writeText(access.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }, [access.password]);

  // Block copy / cut / context-menu / drag for EVERYONE (no admin bypass).
  const block = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      if ("clipboardData" in e) {
        (e as React.ClipboardEvent).clipboardData?.setData("text/plain", "");
      }
      if (e.type === "copy" || e.type === "cut") {
        toast.info(t("rangkuman.copy_blocked"));
      }
    },
    [t]
  );

  if (!ver) return null;

  return (
    <div
      data-cheatsheet-protected
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* Header: title + version toggle (no notice / no badge). */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Lock className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-bold text-foreground">
            {t("subject.cheatsheet_title")}
          </span>
          {access.unlocked && (
            <button
              type="button"
              onClick={() => {
                setRevealed(false);
                setCopied(false);
                setPopupOpen(true);
              }}
              className="hs-press inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
            >
              <Download className="h-3.5 w-3.5" />
              {t("subject.cheatsheet_download")}
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={toggleLock}
              disabled={toggling}
              className="hs-press inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
              title={t("subject.cheatsheet_admin_hint")}
            >
              {access.unlocked ? (
                <Unlock className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {access.unlocked
                ? t("subject.cheatsheet_lock_close")
                : t("subject.cheatsheet_lock_open")}
            </button>
          )}
        </div>
        {viewVersions.length > 1 && (
          <div className="flex rounded-lg border border-border p-0.5 text-[11px] font-semibold">
            {viewVersions.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => switchVersion(i)}
                className={`hs-press rounded-md px-3 py-1 transition-colors ${
                  i === verIdx
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stage (relative wrapper holds the floating controls). */}
      <div className="relative">
        <div
          ref={stageRef}
          className="cheatsheet-stage overflow-auto overscroll-contain bg-muted/30 p-3 [-webkit-touch-callout:none]"
          style={{ maxHeight: "78vh", userSelect: "none", WebkitUserSelect: "none" }}
          onContextMenu={block}
          onCopy={block}
          onCut={block}
          onDragStart={block}
        >
          {/* Default = fit to width (capped ~720px so it's big & readable, no
              horizontal scroll). Vertical scroll within the stage is fine; the
              fixed A4 aspect-ratio reserves space so paging never jumps. Zoom
              scales the width → horizontal scroll only appears when zoomed in. */}
          <div
            className="relative mx-auto"
            style={{ width: `calc(min(100%, 720px) * ${zoom})`, aspectRatio: "1400 / 1980" }}
          >
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${t("subject.cheatsheet_page")} ${page}`}
              draggable={false}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
              className="block h-full w-full rounded-md border border-border bg-white shadow-sm select-none"
            />
            {/* Per-user identity watermark, over the image. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-md"
              style={{
                color: "#0f172a",
                opacity: 0.12,
                backgroundImage: watermark,
                backgroundRepeat: "repeat",
              }}
            />
          </div>
        </div>

        {/* Floating prev/next arrows. */}
        <button
          type="button"
          onClick={() => goPage(page - 1)}
          disabled={page <= 1}
          aria-label={t("subject.cheatsheet_prev")}
          className="hs-press absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-md backdrop-blur transition-opacity hover:bg-card disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => goPage(page + 1)}
          disabled={page >= total}
          aria-label={t("subject.cheatsheet_next")}
          className="hs-press absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-md backdrop-blur transition-opacity hover:bg-card disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Page indicator. */}
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground shadow-sm backdrop-blur">
          {t("subject.cheatsheet_page")} {page}/{total}
        </div>

        {/* Zoom controls. */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoomBy(-ZOOM_STEP)}
            disabled={zoom <= ZOOM_MIN}
            aria-label="zoom out"
            className="hs-press flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur disabled:opacity-30"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="flex h-8 min-w-[3rem] items-center justify-center rounded-full border border-border bg-card/90 px-1 text-[11px] font-semibold tabular-nums text-muted-foreground shadow-sm backdrop-blur">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomBy(ZOOM_STEP)}
            disabled={zoom >= ZOOM_MAX}
            aria-label="zoom in"
            className="hs-press flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur disabled:opacity-30"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Download popup — version chooser + copy-able password + disclaimer. */}
      {popupOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label={t("subject.cheatsheet_close")}
            onClick={() => setPopupOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setPopupOpen(false)}
              aria-label={t("subject.cheatsheet_close")}
              className="hs-press absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-1 flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                {t("subject.cheatsheet_dl_title")}
              </h3>
            </div>
            <p className="mb-4 text-[11px] leading-snug text-muted-foreground">
              {t("subject.cheatsheet_dl_disclaimer")}
            </p>

            {/* Password card — click to copy. */}
            {access.password && (
              <button
                type="button"
                onClick={() => (revealed ? copyPassword() : setRevealed(true))}
                className="hs-press mb-4 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("subject.cheatsheet_dl_password")}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono text-sm font-bold tracking-wide text-foreground">
                    {revealed ? access.password : "•".repeat(access.password.length)}
                  </code>
                  {!revealed ? (
                    <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : copied ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground/80">
                  {!revealed
                    ? t("subject.cheatsheet_dl_reveal")
                    : copied
                      ? t("subject.cheatsheet_dl_copied")
                      : t("subject.cheatsheet_dl_click_copy")}
                </div>
              </button>
            )}

            {/* Version chooser — each is a direct download of the locked PDF. */}
            <div className="grid gap-2">
              {versions.map((v) => (
                <a
                  key={v.id}
                  href={`/api/cheatsheet/${data.subject}/download?v=${v.id}`}
                  download
                  className="hs-press flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                >
                  <Download className="h-4 w-4" />
                  {t("subject.cheatsheet_dl_get")} — {v.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
