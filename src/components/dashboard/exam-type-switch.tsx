"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, ClipboardList } from "lucide-react";
import type { ExamCategory } from "@/lib/countdown";

interface ExamTypeSwitchProps {
  value: ExamCategory;
  onChange: (category: ExamCategory) => void;
  /** When provided, a category with no upcoming exam renders disabled. */
  available?: Record<ExamCategory, boolean>;
}

const SEGMENTS: {
  key: ExamCategory;
  label: string;
  Icon: typeof MapPin;
}[] = [
  { key: "onsite", label: "Onsite", Icon: MapPin },
  { key: "assignment", label: "Tugas", Icon: ClipboardList },
];

const TOUCH_TOOLTIP_MS = 1200;

/**
 * Compact icon-only segmented control that flips the countdown between the next
 * onsite exam and the next assignment. A single `openKey` drives the label
 * tooltip, so only one is ever shown. On desktop it follows hover/focus; on a
 * tap (non-mouse pointer) it flashes briefly then auto-hides.
 */
export function ExamTypeSwitch({ value, onChange, available }: ExamTypeSwitchProps) {
  const [openKey, setOpenKey] = useState<ExamCategory | null>(null);
  const pointerType = useRef<string>("mouse");
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  // Clear pending auto-hide on unmount.
  useEffect(() => clearTimer, []);

  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {SEGMENTS.map(({ key, label, Icon }) => {
        const active = value === key;
        const disabled = available ? !available[key] : false;
        const open = !disabled && openKey === key;
        // Hover/focus only persist the tooltip on devices with a real pointer.
        const show = () => {
          if (!disabled && pointerType.current === "mouse") setOpenKey(key);
        };
        // Only clear if this segment is the one open, so a sibling that just
        // opened isn't immediately closed by this one's blur/leave.
        const hide = () => setOpenKey((k) => (k === key ? null : k));
        return (
          <div key={key} className="relative">
            <button
              type="button"
              onPointerDown={(e) => {
                pointerType.current = e.pointerType || "mouse";
              }}
              onClick={() => {
                if (disabled) return;
                onChange(key);
                clearTimer();
                setOpenKey(key);
                // Touch/pen: flash the label briefly, then auto-hide.
                if (pointerType.current !== "mouse") {
                  hideTimer.current = setTimeout(
                    () => setOpenKey((k) => (k === key ? null : k)),
                    TOUCH_TOOLTIP_MS
                  );
                }
              }}
              onMouseEnter={show}
              onMouseLeave={hide}
              onFocus={show}
              onBlur={hide}
              disabled={disabled}
              aria-pressed={active}
              aria-label={label}
              className={`flex items-center justify-center rounded-md p-1 transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
            </button>
            <span
              className={`pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background shadow-md transition-opacity duration-150 ${
                open ? "opacity-100" : "opacity-0"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
