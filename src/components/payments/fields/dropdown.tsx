"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly DropdownOption[];
  placeholder?: string;
  invalid?: boolean;
}

export function Dropdown({ id, value, onChange, options, placeholder, invalid }: DropdownProps) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full appearance-none rounded-xl border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30",
          invalid ? "border-destructive/60" : "border-border",
          value ? "text-foreground" : "text-muted-foreground/60"
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-foreground">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
