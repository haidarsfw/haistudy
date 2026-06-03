"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxFieldProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  invalid?: boolean;
}

/** Single acknowledgement checkbox (e.g. Share-package terms). */
export function CheckboxField({ checked, onChange, label, description, invalid }: CheckboxFieldProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all",
        checked
          ? "border-primary bg-primary/5"
          : invalid
            ? "border-destructive/60 hover:bg-muted/40"
            : "border-border hover:border-primary/30 hover:bg-muted/40"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}
