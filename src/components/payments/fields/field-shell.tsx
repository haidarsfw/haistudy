"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface FieldShellProps {
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
 * The control is pinned to the BOTTOM of the cell (`mt-auto`). In the two-column
 * desktop grid the cells in a row already stretch to equal height, so bottom-
 * pinning is what makes the inputs line up across the row — and it does it for
 * any label block, whether the field has no description, one line, or two.
 *
 * The obvious alternative, reserving a fixed height for the description, only
 * holds while every description happens to fit one line; the first one that
 * wraps knocks its neighbour out of alignment again, and nothing in the code
 * would say why. Height comes out of the layout here instead of a magic number.
 */
export function FieldShell({ label, description, required, error, htmlFor, children }: FieldShellProps) {
  return (
    <div className="flex h-full flex-col">
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
      <div className="mt-auto pt-2">{children}</div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 pt-2 text-xs font-medium text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
