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

/** Google-Forms-style field wrapper: label, helper text, required *, error. */
export function FieldShell({ label, description, required, error, htmlFor, children }: FieldShellProps) {
  return (
    <div className="space-y-2">
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
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 text-xs font-medium text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
