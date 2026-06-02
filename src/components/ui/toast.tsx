"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
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
  success: { tint: "bg-emerald-500/10 text-emerald-500", icon: <CircleCheckIcon className="h-3.5 w-3.5" /> },
  error: { tint: "bg-destructive/10 text-destructive", icon: <OctagonXIcon className="h-3.5 w-3.5" /> },
  info: { tint: "bg-sky-500/10 text-sky-500", icon: <InfoIcon className="h-3.5 w-3.5" /> },
  warning: { tint: "bg-amber-500/10 text-amber-500", icon: <TriangleAlertIcon className="h-3.5 w-3.5" /> },
  default: { tint: "bg-primary/10 text-primary", icon: <BellIcon className="h-3.5 w-3.5" /> },
  message: { tint: "bg-primary/10 text-primary", icon: <BellIcon className="h-3.5 w-3.5" /> },
};

function ToastCard({ item }: { item: ToastItem }) {
  // True during a drag so the trailing click doesn't also fire dismiss.
  const draggedRef = React.useRef(false);
  const close = React.useCallback(() => removeToast(item.id), [item.id]);

  // Pause auto-dismiss while hovered; resume with a short grace on leave.
  const onEnter = React.useCallback(() => pauseRemoval(item.id), [item.id]);
  const onLeave = React.useCallback(() => {
    if (item.duration !== Infinity) scheduleRemoval(item.id, 2000);
  }, [item.id, item.duration]);

  const style = TYPE_STYLE[item.type];
  const icon = item.icon ?? style.icon;

  // No X button: click or swipe (any direction) to dismiss.
  return (
    <motion.div
      layout
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, x: 28, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 28, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
      drag
      dragSnapToOrigin
      dragElastic={0.5}
      onDragStart={() => {
        draggedRef.current = true;
      }}
      onDragEnd={(_, info) => {
        const { offset, velocity } = info;
        const dismiss =
          offset.x > 60 ||
          offset.x < -60 ||
          offset.y < -60 ||
          Math.abs(velocity.x) > 500 ||
          velocity.y < -500;
        if (dismiss) close();
        requestAnimationFrame(() => {
          draggedRef.current = false;
        });
      }}
      onClick={() => {
        if (draggedRef.current) return;
        close();
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="cn-toast pointer-events-auto relative flex w-fit min-w-[13rem] max-w-full cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left text-card-foreground shadow-lg sm:min-w-[17rem] sm:gap-3 sm:px-4 sm:py-3"
    >
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.tint}`}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-snug break-words sm:text-sm">
          {item.title}
        </div>
        {item.description && (
          <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground break-words sm:text-xs">
            {item.description}
          </div>
        )}
        {item.action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              item.action!.onClick();
              close();
            }}
            className="mt-2 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {item.action.label}
          </button>
        )}
      </div>
    </motion.div>
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
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
