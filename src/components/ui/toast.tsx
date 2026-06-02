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
  const [leaving, setLeaving] = React.useState(false);

  const close = React.useCallback(() => {
    setLeaving(true);
    // Match the CSS exit transition before removing from store.
    setTimeout(() => removeToast(item.id), 180);
  }, [item.id]);

  const style = TYPE_STYLE[item.type];
  const icon = item.icon ?? style.icon;

  // Layout mirrors NotificationItem: small top-left dismiss (hover-reveal on
  // desktop, always on mobile), type icon in a tinted circle, title + desc.
  return (
    <div
      role="status"
      aria-live="polite"
      data-leaving={leaving || undefined}
      className="cn-toast group/item pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-card-foreground shadow-lg"
    >
      <button
        onClick={close}
        aria-label="Tutup"
        className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-card/80 text-muted-foreground ring-1 ring-border backdrop-blur transition-opacity hover:text-foreground opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100"
      >
        <XIcon className="h-3 w-3" />
      </button>

      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.tint}`}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium leading-snug break-words">{item.title}</div>
        {item.description && (
          <div className="mt-0.5 text-[11px] text-muted-foreground break-words">
            {item.description}
          </div>
        )}
        {item.action && (
          <button
            onClick={() => {
              item.action!.onClick();
              close();
            }}
            className="mt-2 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
      className="pointer-events-none fixed right-3 top-3 z-[140] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2 sm:right-4 sm:top-4"
      aria-live="polite"
      aria-atomic="false"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
