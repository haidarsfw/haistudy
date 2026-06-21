"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  X,
  Pen,
  Eraser,
  Type as TypeIcon,
  Undo2,
  Redo2,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Move,
  PanelRight,
  Maximize2,
  Info,
} from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { isDismissedToday, dismissToday } from "@/lib/daily-dismiss";

export const SCRATCH_KEY_PREFIX = "hs-exam-scratch-";
// User-level (not per-attempt) window prefs: position, size, mode persist so the
// scratchpad reopens exactly where it was left.
const WIN_KEY = "hs-exam-scratch-win";
const FLOAT_MIN_W = 280;
const FLOAT_MIN_H = 320;

type Tool = "pen" | "eraser" | "text";
type WinMode = "float" | "dock" | "fullscreen";
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface PersistedWin {
  mode: WinMode;
  floatRect: Rect;
  dockW: number;
  dockH: number;
}

function defaultRect(): Rect {
  const w = 460;
  const h = 560;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  return { x: Math.max(8, vw - w - 16), y: 80, w: Math.min(w, vw - 16), h: Math.min(h, vh - 16) };
}

function loadWin(): PersistedWin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WIN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    const r = p.floatRect;
    const okRect =
      r &&
      ["x", "y", "w", "h"].every((k) => typeof r[k] === "number" && Number.isFinite(r[k]));
    return {
      mode: p.mode === "dock" || p.mode === "fullscreen" ? p.mode : "float",
      floatRect: okRect ? { x: r.x, y: r.y, w: r.w, h: r.h } : defaultRect(),
      dockW: typeof p.dockW === "number" ? p.dockW : 440,
      dockH: typeof p.dockH === "number" ? p.dockH : 0,
    };
  } catch {
    return null;
  }
}
interface Point {
  x: number;
  y: number;
}
interface Stroke {
  color: string;
  width: number;
  erase: boolean;
  points: Point[];
}
interface TextBox {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}
interface Page {
  id: string;
  strokes: Stroke[];
  texts: TextBox[];
}

const COLORS = ["#111827", "#2563eb", "#dc2626", "#16a34a", "#d97706"];
const WIDTHS = [2, 4, 7];

let _id = 0;
const uid = () => `${Date.now().toString(36)}-${(_id++).toString(36)}`;
const blankPage = (): Page => ({ id: uid(), strokes: [], texts: [] });

interface Props {
  attemptId: string | null;
  onClose: () => void;
  /** Reports window mode/size so the player can shift exam content when docked. */
  onLayout?: (l: { mode: WinMode; isMobile: boolean; dockW: number; dockH: number }) => void;
  /** Stacking order (last-focused tool on top) + focus callback from the player. */
  zIndex?: number;
  onFocus?: () => void;
}

/**
 * In-exam scratchpad ("corat-coret"). Free drawing (pen/eraser) + draggable
 * text boxes across multiple reorderable pages. Pointer Events so it works with
 * mouse, touch, and stylus. Vector strokes (lightweight, undo-friendly).
 *
 * Windowed so the question stays visible while drawing: float (draggable +
 * resizable), dock (pinned edge, resizable), or fullscreen. Autosaved to
 * localStorage per attempt; the player clears it on submit/exit.
 */
export function ExamScratchpad({ attemptId, onClose, onLayout, zIndex = 110, onFocus }: Props) {
  const { t } = useTranslation();
  const [persisted] = useState<PersistedWin | null>(() => loadWin());

  const [pages, setPages] = useState<Page[]>([blankPage()]);
  const [cur, setCur] = useState(0);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showIntro, setShowIntro] = useState(
    () => !isDismissedToday("exam-scratchpad-intro")
  );

  // ── Windowing (manual move + 8-way resize, persisted user-level) ──
  const [isMobile, setIsMobile] = useState(false);
  const [mode, setMode] = useState<WinMode>(persisted?.mode ?? "float");
  const [floatRect, setFloatRect] = useState<Rect>(persisted?.floatRect ?? defaultRect());
  const [dockW, setDockW] = useState(persisted?.dockW || 440); // desktop dock width
  const [dockH, setDockH] = useState(persisted?.dockH ?? 0); // mobile dock height (set on mount)

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const liveStroke = useRef<Stroke | null>(null);
  const histories = useRef<Record<string, { past: string[]; future: string[] }>>({});
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  const page = pages[cur];

  // Detect small screens; default mobile to a bottom dock (see question above).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => {
      setIsMobile(mq.matches);
      if (mq.matches) {
        setMode("dock"); // phones always dock (bottom sheet)
        setDockH((h) => h || Math.round(window.innerHeight * 0.5));
      }
    };
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Report layout to the player so it can shift exam content left when docked.
  useEffect(() => {
    onLayout?.({ mode, isMobile, dockW, dockH });
  }, [mode, isMobile, dockW, dockH, onLayout]);

  // Persist window prefs (debounced) + flush on close/unmount so the scratchpad
  // reopens exactly where the user left it (position, size, mode).
  const winRef = useRef<PersistedWin>({ mode, floatRect, dockW, dockH });
  winRef.current = { mode, floatRect, dockW, dockH };
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(WIN_KEY, JSON.stringify(winRef.current));
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [mode, floatRect, dockW, dockH]);
  useEffect(() => {
    return () => {
      try {
        localStorage.setItem(WIN_KEY, JSON.stringify(winRef.current));
      } catch {
        /* ignore */
      }
    };
  }, []);

  // ── Load autosave ──
  useEffect(() => {
    if (!attemptId) return;
    try {
      const raw = localStorage.getItem(SCRATCH_KEY_PREFIX + attemptId);
      if (raw) {
        const parsed = JSON.parse(raw) as Page[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPages(parsed);
          setCur(0);
        }
      }
    } catch {
      /* ignore */
    }
  }, [attemptId]);

  // ── Autosave (debounced) ──
  useEffect(() => {
    if (!attemptId) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(SCRATCH_KEY_PREFIX + attemptId, JSON.stringify(pages));
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(id);
  }, [pages, attemptId]);

  // ── Canvas sizing + redraw ──
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h, dpr } = sizeRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const s of page.strokes) drawStroke(ctx, s);
  }, [page]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sizeRef.current = { w: rect.width, h: rect.height, dpr };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    redraw();
  }, [redraw]);

  useLayoutEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [resize]);

  useEffect(() => {
    redraw();
  }, [redraw, cur, pages]);

  // Re-measure the canvas whenever the window mode/size changes (e.g. float ->
  // dock) so the surface tracks the new container — no reopen needed (#8).
  useEffect(() => {
    resize();
  }, [resize, mode, floatRect, dockW, dockH, isMobile]);

  // ── History ──
  const snapshot = useCallback(() => {
    const h = (histories.current[page.id] ??= { past: [], future: [] });
    h.past.push(JSON.stringify({ strokes: page.strokes, texts: page.texts }));
    if (h.past.length > 50) h.past.shift();
    h.future = [];
  }, [page]);

  const applyToPage = useCallback(
    (mut: (p: Page) => Page) => {
      setPages((prev) => prev.map((p, i) => (i === cur ? mut(p) : p)));
    },
    [cur]
  );

  const undo = useCallback(() => {
    const h = histories.current[page.id];
    if (!h || h.past.length === 0) return;
    const prevState = h.past.pop()!;
    h.future.push(JSON.stringify({ strokes: page.strokes, texts: page.texts }));
    const parsed = JSON.parse(prevState) as Pick<Page, "strokes" | "texts">;
    applyToPage((p) => ({ ...p, strokes: parsed.strokes, texts: parsed.texts }));
  }, [page, applyToPage]);

  const redo = useCallback(() => {
    const h = histories.current[page.id];
    if (!h || h.future.length === 0) return;
    const nextState = h.future.pop()!;
    h.past.push(JSON.stringify({ strokes: page.strokes, texts: page.texts }));
    const parsed = JSON.parse(nextState) as Pick<Page, "strokes" | "texts">;
    applyToPage((p) => ({ ...p, strokes: parsed.strokes, texts: parsed.texts }));
  }, [page, applyToPage]);

  // ── Pointer drawing ──
  const pointFromEvent = (e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (tool === "text") {
      const pt = pointFromEvent(e);
      snapshot();
      applyToPage((p) => ({
        ...p,
        texts: [...p.texts, { id: uid(), x: pt.x, y: pt.y, text: "", color }],
      }));
      return;
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    snapshot();
    liveStroke.current = {
      color,
      width: tool === "eraser" ? Math.max(16, width * 4) : width,
      erase: tool === "eraser",
      points: [pointFromEvent(e)],
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current || !liveStroke.current) return;
    const pt = pointFromEvent(e);
    const s = liveStroke.current;
    const prev = s.points[s.points.length - 1];
    s.points.push(pt);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && prev) drawSegment(ctx, s, prev, pt);
  };

  const endStroke = () => {
    if (!drawing.current || !liveStroke.current) return;
    const s = liveStroke.current;
    drawing.current = false;
    liveStroke.current = null;
    if (s.points.length > 0) applyToPage((p) => ({ ...p, strokes: [...p.strokes, s] }));
  };

  // ── Page ops ──
  const addPage = () => {
    setPages((prev) => {
      const next = [...prev];
      next.splice(cur + 1, 0, blankPage());
      return next;
    });
    setCur((c) => c + 1);
  };

  const deletePage = () => {
    setPages((prev) => (prev.length === 1 ? [blankPage()] : prev.filter((_, i) => i !== cur)));
    setCur((c) => Math.max(0, c - (cur === pages.length - 1 ? 1 : 0)));
  };

  const movePage = (dir: -1 | 1) => {
    const j = cur + dir;
    if (j < 0 || j >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      [next[cur], next[j]] = [next[j], next[cur]];
      return next;
    });
    setCur(j);
  };

  const clearPage = () => {
    snapshot();
    applyToPage((p) => ({ ...p, strokes: [], texts: [] }));
    setConfirmClear(false);
  };

  const updateText = (id: string, text: string) =>
    applyToPage((p) => ({
      ...p,
      texts: p.texts.map((tb) => (tb.id === id ? { ...tb, text } : tb)),
    }));

  const moveText = (id: string, x: number, y: number) =>
    applyToPage((p) => ({
      ...p,
      texts: p.texts.map((tb) => (tb.id === id ? { ...tb, x, y } : tb)),
    }));

  const deleteText = (id: string) => {
    snapshot();
    applyToPage((p) => ({ ...p, texts: p.texts.filter((tb) => tb.id !== id) }));
  };

  // ── Move (float) — dragging the header repositions the window ──
  const startMove = (e: React.PointerEvent) => {
    if (mode !== "float") return;
    if ((e.target as HTMLElement).closest("button")) return; // let header buttons click
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    const r0 = floatRect;
    const onMove = (ev: PointerEvent) => {
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;
      const x = Math.max(0, Math.min(r0.x + (ev.clientX - sx), maxW - 40));
      const y = Math.max(0, Math.min(r0.y + (ev.clientY - sy), maxH - 40));
      setFloatRect((r) => ({ ...r, x, y }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── Resize (float) — any edge or corner; `dir` holds the active edges ──
  const startFloatResize = (dir: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const sy = e.clientY;
    const r0 = floatRect;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      let { x, y, w, h } = r0;
      if (dir.includes("e")) w = r0.w + dx;
      if (dir.includes("s")) h = r0.h + dy;
      if (dir.includes("w")) {
        w = r0.w - dx;
        x = r0.x + dx;
      }
      if (dir.includes("n")) {
        h = r0.h - dy;
        y = r0.y + dy;
      }
      if (w < FLOAT_MIN_W) {
        if (dir.includes("w")) x -= FLOAT_MIN_W - w;
        w = FLOAT_MIN_W;
      }
      if (h < FLOAT_MIN_H) {
        if (dir.includes("n")) y -= FLOAT_MIN_H - h;
        h = FLOAT_MIN_H;
      }
      x = Math.max(0, x);
      y = Math.max(0, y);
      w = Math.min(w, window.innerWidth - x);
      h = Math.min(h, window.innerHeight - y);
      setFloatRect({ x, y, w, h });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── Resize (dock edge) ──
  const startDockResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const sy = e.clientY;
    const s = { dockW, dockH };
    const onMove = (ev: PointerEvent) => {
      if (!isMobile) {
        setDockW(Math.max(300, Math.min(window.innerWidth * 0.8, s.dockW - (ev.clientX - sx))));
      } else {
        setDockH(Math.max(220, Math.min(window.innerHeight * 0.85, s.dockH - (ev.clientY - sy))));
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── Window container geometry per mode ──
  let containerClassName = "pointer-events-auto absolute flex flex-col overflow-hidden border border-border bg-background shadow-2xl";
  let containerStyle: React.CSSProperties = {};
  if (mode === "fullscreen") {
    containerClassName += " inset-0";
  } else if (mode === "dock") {
    if (isMobile) {
      containerClassName += " inset-x-0 bottom-0 rounded-t-2xl border-x-0 border-b-0";
      containerStyle = { height: dockH || "50vh" };
    } else {
      containerClassName += " right-0 top-0 bottom-0 border-y-0 border-r-0";
      containerStyle = { width: dockW };
    }
  } else {
    // float
    containerClassName += " rounded-2xl";
    const vw = typeof window !== "undefined" ? window.innerWidth : floatRect.w;
    const vh = typeof window !== "undefined" ? window.innerHeight : floatRect.h;
    containerStyle = {
      left: Math.min(Math.max(0, floatRect.x), Math.max(0, vw - 80)),
      top: Math.min(Math.max(0, floatRect.y), Math.max(0, vh - 80)),
      width: Math.min(floatRect.w, vw - 8),
      height: Math.min(floatRect.h, vh - 8),
    };
  }

  const canDrag = mode === "float";

  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex }}
      onPointerDownCapture={onFocus}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={containerClassName}
        style={containerStyle}
      >
        {/* Header (also the float move handle) */}
        <div
          onPointerDown={startMove}
          className={`flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card/80 px-3 py-2 backdrop-blur-sm ${
            canDrag ? "cursor-move touch-none" : ""
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {canDrag && <Move className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
            <Pen className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-bold text-foreground">
              {t("exam.scratchpad_title")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ModeBtn active={mode === "float"} onClick={() => setMode("float")} label={t("exam.scratchpad_mode_float")} icon={Move} />
            <ModeBtn active={mode === "dock"} onClick={() => setMode("dock")} label={t("exam.scratchpad_mode_dock")} icon={PanelRight} />
            <ModeBtn active={mode === "fullscreen"} onClick={() => setMode("fullscreen")} label={t("exam.scratchpad_mode_fullscreen")} icon={Maximize2} />
            <button
              type="button"
              onClick={onClose}
              aria-label={t("exam.scratchpad_close")}
              className="hs-press ml-0.5 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Usage tip (dismiss = hidden for the rest of the day) */}
        {showIntro && (
          <div className="flex shrink-0 items-start gap-2 border-b border-border bg-primary/5 px-3 py-1.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
            <p className="flex-1 text-[11px] leading-snug text-muted-foreground">
              {t("exam.scratchpad_tips")}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowIntro(false);
                dismissToday("exam-scratchpad-intro");
              }}
              aria-label={t("exam.scratchpad_close")}
              className="hs-press shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border bg-card/60 px-2.5 py-1.5">
          <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} label={t("exam.scratchpad_pen")} icon={Pen} />
          <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} label={t("exam.scratchpad_eraser")} icon={Eraser} />
          <ToolBtn active={tool === "text"} onClick={() => setTool("text")} label={t("exam.scratchpad_text")} icon={TypeIcon} />
          <span className="mx-0.5 h-5 w-px bg-border" />
          <div className="flex items-center gap-1" title={t("exam.scratchpad_color")}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`${t("exam.scratchpad_color")} ${c}`}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${
                  color === c ? "scale-110 border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <div className="flex items-center gap-1" title={t("exam.scratchpad_size")}>
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWidth(w)}
                aria-label={`${t("exam.scratchpad_size")} ${w}`}
                className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                  width === w ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <span className="rounded-full bg-foreground" style={{ width: w + 2, height: w + 2 }} />
              </button>
            ))}
          </div>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <ToolBtn onClick={undo} label={t("exam.scratchpad_undo")} icon={Undo2} />
          <ToolBtn onClick={redo} label={t("exam.scratchpad_redo")} icon={Redo2} />
          <ToolBtn onClick={() => setConfirmClear(true)} label={t("exam.scratchpad_clear")} icon={Trash2} />
        </div>

        {/* Canvas */}
        <div className="relative flex-1 overflow-hidden p-2">
          <div ref={wrapRef} className="scratch-paper relative h-full w-full overflow-hidden rounded-lg border border-border">
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerLeave={endStroke}
              onPointerCancel={endStroke}
              className="absolute inset-0 touch-none"
              style={{ cursor: tool === "text" ? "text" : "crosshair" }}
            />
            {page.texts.map((tb) => (
              <ScratchTextBox
                key={tb.id}
                box={tb}
                onChange={(v) => updateText(tb.id, v)}
                onMove={(x, y) => moveText(tb.id, x, y)}
                onCommit={snapshot}
                onDelete={() => deleteText(tb.id)}
              />
            ))}
          </div>
        </div>

        {/* Page nav */}
        <div className="flex shrink-0 items-center justify-between gap-1.5 border-t border-border bg-card/80 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <IconBtn onClick={() => movePage(-1)} disabled={cur === 0} label={t("exam.scratchpad_reorder")} icon={ArrowLeft} />
            <IconBtn onClick={() => movePage(1)} disabled={cur === pages.length - 1} label={t("exam.scratchpad_reorder")} icon={ArrowRight} />
          </div>
          <div className="flex items-center gap-1.5">
            <IconBtn onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0} label={t("exam.scratchpad_prev_page")} icon={ChevronLeft} />
            <span className="min-w-14 text-center text-xs font-semibold tabular-nums text-muted-foreground">
              {t("exam.scratchpad_page")} {cur + 1}/{pages.length}
            </span>
            <IconBtn onClick={() => setCur((c) => Math.min(pages.length - 1, c + 1))} disabled={cur === pages.length - 1} label={t("exam.scratchpad_next_page")} icon={ChevronRight} />
          </div>
          <div className="flex items-center gap-1.5">
            <IconBtn onClick={deletePage} disabled={pages.length === 1 && page.strokes.length === 0 && page.texts.length === 0} label={t("exam.scratchpad_delete_page")} icon={Trash2} />
            <button
              type="button"
              onClick={addPage}
              className="hs-press flex h-9 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("exam.scratchpad_add_page")}</span>
            </button>
          </div>
        </div>

        {/* Resize handles — float: any edge + corner; dock: the shared edge */}
        {mode === "float" && (
          <>
            <ResizeHandle onDown={startFloatResize("n")} className="left-3 right-3 top-0 h-1.5 cursor-ns-resize" />
            <ResizeHandle onDown={startFloatResize("s")} className="left-3 right-3 bottom-0 h-1.5 cursor-ns-resize" />
            <ResizeHandle onDown={startFloatResize("w")} className="left-0 top-3 bottom-3 w-1.5 cursor-ew-resize" />
            <ResizeHandle onDown={startFloatResize("e")} className="right-0 top-3 bottom-3 w-1.5 cursor-ew-resize" />
            <ResizeHandle onDown={startFloatResize("nw")} className="left-0 top-0 h-3.5 w-3.5 cursor-nwse-resize" />
            <ResizeHandle onDown={startFloatResize("ne")} className="right-0 top-0 h-3.5 w-3.5 cursor-nesw-resize" />
            <ResizeHandle onDown={startFloatResize("sw")} className="left-0 bottom-0 h-3.5 w-3.5 cursor-nesw-resize" />
            <div
              onPointerDown={startFloatResize("se")}
              className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-nwse-resize touch-none"
              style={{
                background:
                  "linear-gradient(135deg, transparent 50%, var(--color-muted-foreground, #888) 50%, transparent 60%, var(--color-muted-foreground, #888) 60%)",
                opacity: 0.4,
              }}
              aria-label="resize"
            />
          </>
        )}
        {mode === "dock" && !isMobile && (
          <div
            onPointerDown={startDockResize}
            className="absolute left-0 top-0 bottom-0 z-10 w-1.5 cursor-ew-resize touch-none hover:bg-primary/30"
            aria-label="resize"
          />
        )}
        {mode === "dock" && isMobile && (
          <div
            onPointerDown={startDockResize}
            className="absolute left-0 right-0 top-0 z-10 flex h-3 cursor-ns-resize touch-none items-center justify-center"
            aria-label="resize"
          >
            <span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
          </div>
        )}
      </motion.div>

      {/* Clear confirm */}
      {confirmClear && (
        <div className="pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-5 shadow-xl">
            <p className="text-sm font-semibold text-foreground">
              {t("exam.scratchpad_clear_confirm")}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="hs-press flex-1 rounded-lg border border-border bg-card py-2 text-sm font-semibold text-muted-foreground"
              >
                {t("exam.scratchpad_close")}
              </button>
              <button
                type="button"
                onClick={clearPage}
                className="hs-press flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white"
              >
                {t("exam.scratchpad_clear")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Canvas helpers ──
function applyStrokeStyle(ctx: CanvasRenderingContext2D, s: Stroke) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = s.width;
  ctx.strokeStyle = s.color;
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.points.length === 0) return;
  applyStrokeStyle(ctx, s);
  ctx.beginPath();
  ctx.moveTo(s.points[0].x, s.points[0].y);
  for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
  if (s.points.length === 1) ctx.lineTo(s.points[0].x + 0.1, s.points[0].y + 0.1);
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
}

function drawSegment(ctx: CanvasRenderingContext2D, s: Stroke, a: Point, b: Point) {
  applyStrokeStyle(ctx, s);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
}

// ── UI bits ──
function ModeBtn({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`hs-press flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function ToolBtn({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`hs-press flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-semibold transition-all ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function IconBtn({
  onClick,
  disabled,
  label,
  icon: Icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="hs-press flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-30"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ResizeHandle({
  onDown,
  className,
}: {
  onDown: (e: React.PointerEvent) => void;
  className: string;
}) {
  return (
    <div
      onPointerDown={onDown}
      className={`absolute z-10 touch-none ${className}`}
      aria-label="resize"
    />
  );
}

function ScratchTextBox({
  box,
  onChange,
  onMove,
  onCommit,
  onDelete,
}: {
  box: TextBox;
  onChange: (v: string) => void;
  onMove: (x: number, y: number) => void;
  onCommit: () => void;
  onDelete: () => void;
}) {
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const onHandleDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const parent = (e.currentTarget as HTMLElement).parentElement!.parentElement!.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - (parent.left + box.x), dy: e.clientY - (parent.top + box.y) };
  };
  const onHandleMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    const parent = (e.currentTarget as HTMLElement).parentElement!.parentElement!.getBoundingClientRect();
    onMove(e.clientX - parent.left - dragRef.current.dx, e.clientY - parent.top - dragRef.current.dy);
  };
  const onHandleUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="absolute flex max-w-[70%] items-start gap-1" style={{ left: box.x, top: box.y }}>
      <div
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        className="mt-1 cursor-move touch-none select-none rounded bg-foreground/10 px-1 text-[10px] leading-4 text-foreground/50"
        title="drag"
      >
        ⠿
      </div>
      <textarea
        value={box.text}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        rows={1}
        placeholder="…"
        className="min-w-24 resize-none rounded border border-dashed border-foreground/20 bg-white/70 px-1 py-0.5 text-sm outline-none focus:border-primary"
        style={{ color: box.color }}
      />
      <button
        type="button"
        onClick={onDelete}
        className="mt-0.5 rounded p-0.5 text-foreground/40 hover:text-red-500"
        aria-label="delete"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
