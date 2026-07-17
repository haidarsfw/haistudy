"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface FieldShellProps {
  /** Key this field validates under. Lets goNext() scroll to the first failure. */
  fieldKey?: string;
  label: string;
  description?: string;
  required?: boolean;
  error?: string | null;
  htmlFor?: string;
  children: React.ReactNode;
}

/**
 * Field wrapper: label, helper text, required *, error.
 *
 * Two things hold the layout still:
 *
 * 1. The control is pinned to the BOTTOM of the cell (`mt-auto`). Cells in a
 *    grid row already stretch to equal height, so bottom-pinning is what lines
 *    the inputs up across a row — for any label block, whether it has no
 *    description, one line, or two. Reserving a fixed description height would
 *    look identical today and break on the first one that wraps.
 *
 * 2. The error is absolutely positioned, so it takes NO space in the flow.
 *    Validating a field must not move the field, or the neighbouring one, or
 *    everything below it. `pb-5` reserves the strip it lands in.
 */
export function FieldShell({ fieldKey, label, description, required, error, htmlFor, children }: FieldShellProps) {
  return (
    <div
      className="flex h-full flex-col pb-5"
      data-field={fieldKey}
      data-field-error={error ? "true" : undefined}
    >
      <label htmlFor={htmlFor} className="block">
        <span className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        )}
      </label>
      <div className="relative mt-auto pt-2">
        {children}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.12 }}
              // Out of flow on purpose — see (2) above.
              className="absolute left-0 top-full flex items-center gap-1.5 pt-1 text-[11px] font-medium text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
