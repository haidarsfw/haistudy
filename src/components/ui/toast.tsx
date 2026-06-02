"use client";

import * as React from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  XIcon,
  BellIcon,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// In-app toast system (replaces sonner). Fully website-sided.
// `toast` is a module-level singleton so it can be called from
// anywhere - React components, hooks, or plain async code - just
// like sonner. <Toaster/> subscribes via useSyncExternalStore.
// ─────────────────────────────────────────────────────────────

export type ToastType = "default" | "success" | "error" | "info" | "warning" | "message";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  description?: React.ReactNode;
  duration?: number;
  icon?: React.ReactNode;
  action?: ToastAction;
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  title: React.ReactNode;
  createdAt: number;
}

const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;
const MAX_TOASTS = 4;

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  // New array identity so useSyncExternalStore detects the change.
  toasts = [...toasts];
  for (const l of listeners) l();
}

function scheduleRemoval(id: string, duration: number) {
  if (duration === Infinity) return;
  const existing = timers.get(id);
  if (existing) clearTimeout(existing);
  timers.set(
    id,
    setTimeout(() => removeToast(id), duration)
  );
}

// Pause the auto-dismiss timer (used while the pointer is over a toast so it
// doesn't vanish out from under the user trying to read it or click the X).
function pauseRemoval(id: string) {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
}

function removeToast(id: string) {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
  toasts = toasts.filter((x) => x.id !== id);
  emit();
}

function addToast(type: ToastType, title: React.ReactNode, opts?: ToastOptions): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const duration = opts?.duration ?? (type === "error" ? ERROR_DURATION : DEFAULT_DURATION);
  const item: ToastItem = {
    id,
    type,
    title,
    createdAt: Date.now(),
    description: opts?.description,
    duration,
    icon: opts?.icon,
    action: opts?.action,
  };
  toasts = [item, ...toasts].slice(0, MAX_TOASTS);
  emit();
  scheduleRemoval(id, duration);
  return id;
}

type ToastFn = ((title: React.ReactNode, opts?: ToastOptions) => string) & {
  success: (title: React.ReactNode, opts?: ToastOptions) => string;
  error: (title: React.ReactNode, opts?: ToastOptions) => string;
  info: (title: React.ReactNode, opts?: ToastOptions) => string;
  warning: (title: React.ReactNode, opts?: ToastOptions) => string;
  message: (title: React.ReactNode, opts?: ToastOptions) => string;
  dismiss: (id?: string) => void;
};

const toastBase = ((title: React.ReactNode, opts?: ToastOptions) =>
  addToast("default", title, opts)) as ToastFn;
toastBase.success = (title, opts) => addToast("success", title, opts);
toastBase.error = (title, opts) => addToast("error", title, opts);
toastBase.info = (title, opts) => addToast("info", title, opts);
toastBase.warning = (title, opts) => addToast("warning", title, opts);
toastBase.message = (title, opts) => addToast("message", title, opts);
toastBase.dismiss = (id?: string) => {
  if (id) removeToast(id);
  else {
    for (const x of toasts) {
      const t = timers.get(x.id);
      if (t) clearTimeout(t);
      timers.delete(x.id);
    }
    toasts = [];
    emit();
  }
};

export const toast = toastBase;

// ─── Subscription store ───
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return toasts;
}
const emptySnapshot: ToastItem[] = [];
function getServerSnapshot() {
  return emptySnapshot;
}

// Per-type icon + circle tint. Mirrors the notification card so every top-right
// surface (toasts + the bell popup) shares one visual language.
const TYPE_STYLE: Record<ToastType, { tint: string; icon: React.ReactNode }> = {
  success: { tint: "bg-emerald-500/10 text-emerald-500", icon: <CircleCheckIcon className="h-4 w-4" /> },
  error: { tint: "bg-destructive/10 text-destructive", icon: <OctagonXIcon className="h-4 w-4" /> },
  info: { tint: "bg-sky-500/10 text-sky-500", icon: <InfoIcon className="h-4 w-4" /> },
  warning: { tint: "bg-amber-500/10 text-amber-500", icon: <TriangleAlertIcon className="h-4 w-4" /> },
  default: { tint: "bg-primary/10 text-primary", icon: <BellIcon className="h-4 w-4" /> },
  message: { tint: "bg-primary/10 text-primary", icon: <BellIcon className="h-4 w-4" /> },
};

function ToastCard({ item }: { item: ToastItem }) {
  const [leaving, setLeaving] = React.useState(false);
  // Controls the macOS-style corner dismiss. Revealed on hover and kept for a
  // 2s grace after the pointer leaves (so it never vanishes the instant you
  // move toward it). Always visible on touch (no hover there).
  const [showClose, setShowClose] = React.useState(false);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = React.useCallback(() => {
    setLeaving(true);
    // Match the CSS exit transition before removing from store.
    setTimeout(() => removeToast(item.id), 180);
  }, [item.id]);

  const handleEnter = React.useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setShowClose(true);
    pauseRemoval(item.id); // don't auto-dismiss while the user is reading/aiming
  }, [item.id]);

  const handleLeave = React.useCallback(() => {
    // Keep the X for 2s after leaving, then hide it; resume the auto-dismiss
    // with the same 2s grace (persistent toasts stay).
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowClose(false), 2000);
    if (item.duration !== Infinity) scheduleRemoval(item.id, 2000);
  }, [item.id, item.duration]);

  React.useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  const style = TYPE_STYLE[item.type];
  const icon = item.icon ?? style.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      data-leaving={leaving || undefined}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="cn-toast pointer-events-auto relative flex w-fit min-w-[15rem] max-w-full items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left text-card-foreground shadow-lg"
    >
      {/* Dismiss - top-left CORNER chip, macOS-style. Hover-reveal on desktop
          (lingers 2s after un-hover); always visible on touch. */}
      <button
        onClick={close}
        aria-label="Tutup"
        className={`absolute -left-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 text-white shadow ring-2 ring-card transition-opacity dark:bg-neutral-600 opacity-100 ${showClose ? "sm:opacity-100" : "sm:opacity-0"}`}
      >
        <XIcon className="h-3 w-3" />
      </button>

      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.tint}`}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-snug break-words">{item.title}</div>
        {item.description && (
          <div className="mt-0.5 text-xs leading-snug text-muted-foreground break-words">
            {item.description}
          </div>
        )}
        {item.action && (
          <button
            onClick={() => {
              item.action!.onClick();
              close();
            }}
            className="mt-2 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {item.action.label}
          </button>
        )}
      </div>
    </div>
  );
}

export function Toaster() {
  const items = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div
      className="pointer-events-none fixed right-3 top-3 z-[140] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col items-end gap-2 sm:right-4 sm:top-4"
      aria-live="polite"
      aria-atomic="false"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
