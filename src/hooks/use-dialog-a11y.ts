"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight keyboard/a11y wiring for custom (non-Radix) modal overlays:
 *  - Escape closes the dialog (calls `onClose`)
 *  - moves focus INTO the dialog when it opens, and restores it to the
 *    previously-focused element when it closes
 *
 * Pair the returned ref with `role="dialog" aria-modal="true"`,
 * `aria-labelledby`, and `tabIndex={-1}` on the dialog content element. This is
 * not a strict focus trap (Tab can still leave), but it closes the main
 * keyboard/screen-reader gaps for these simple confirm dialogs. We focus the
 * container itself (not a button) so a destructive action is never pre-selected.
 */
export function useDialogA11y<T extends HTMLElement>(
  open: boolean,
  onClose: () => void
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;
    ref.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      // Restore focus to whatever had it before the dialog opened.
      prevActive?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}
