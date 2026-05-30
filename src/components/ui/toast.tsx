"use client";

import * as React from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  XIcon,
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

const TYPE_ICON: Record<ToastType, React.ReactNode> = {
  success: <CircleCheckIcon className="size-4 text-emerald-500" />,
  error: <OctagonXIcon className="size-4 text-destructive" />,
  info: <InfoIcon className="size-4 text-sky-500" />,
  warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
  default: null,
  message: null,
};

function ToastCard({ item }: { item: ToastItem }) {
  const [leaving, setLeaving] = React.useState(false);

  const close = React.useCallback(() => {
    setLeaving(true);
    // Match the CSS exit transition before removing from store.
    setTimeout(() => removeToast(item.id), 180);
  }, [item.id]);

  const icon = item.icon ?? TYPE_ICON[item.type];

  return (
    <div
      role="status"
      aria-live="polite"
      data-leaving={leaving || undefined}
      className="cn-toast pointer-events-auto flex w-full items-start gap-2.5 rounded-[var(--radius)] border border-border bg-popover px-3.5 py-3 text-popover-foreground shadow-lg"
    >
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-snug break-words">{item.title}</div>
        {item.description && (
          <div className="mt-0.5 text-xs text-muted-foreground break-words">
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
      <button
        onClick={close}
        aria-label="Tutup"
        className="shrink-0 rounded-md p-0.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
      >
        <XIcon className="size-3.5" />
      </button>
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
      className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2 sm:right-4 sm:top-4"
      aria-live="polite"
      aria-atomic="false"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
