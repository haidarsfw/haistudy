"use client";

import { useState } from "react";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "@/components/providers/language-provider";
import type { SupportSendStatus, SupportReadReceipt as ReceiptT } from "@/types";

interface Props {
  status?: SupportSendStatus;
  /** True if the OTHER side has a read receipt for this message. */
  isRead: boolean;
  /** When the OTHER side read it (ISO). null if not read yet. */
  readAt?: string | null;
  /** Reader kind that read it (for label). */
  readerKind?: ReceiptT["readerKind"] | null;
  /** Color class for the foreground icon. */
  className?: string;
}

/**
 * WhatsApp-style read receipt:
 *  - sending → clock
 *  - sent + not read → ✓
 *  - sent + read → ✓✓ (sky) — clickable, shows "Read at HH:MM" popover
 *  - error → alert
 */
export function SupportReadReceipt({
  status,
  isRead,
  readAt,
  readerKind,
  className,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (status === "sending") {
    return (
      <Clock
        className={`h-3 w-3 opacity-60 ${className ?? ""}`}
        aria-label="Sending"
      />
    );
  }
  if (status === "error") {
    return (
      <AlertCircle
        className={`h-3 w-3 text-destructive ${className ?? ""}`}
        aria-label="Failed"
      />
    );
  }
  if (isRead) {
    const formatted = readAt
      ? new Date(readAt).toLocaleString("id-ID", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    const readerLabel =
      readerKind === "admin" ? "Admin" : readerKind === "user" ? "User" : "";

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
              className={`inline-flex cursor-pointer items-center justify-center ${
                className ?? ""
              }`}
              aria-label="Read"
            />
          }
        >
          <CheckCheck className="h-3 w-3 text-sky-400" />
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-auto p-2">
          <div className="space-y-0.5 text-[11px]">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCheck className="h-3 w-3 text-sky-400" />
              <span>{t("support.read_at_label")}</span>
            </div>
            {formatted && (
              <div className="text-muted-foreground">
                {readerLabel ? `${readerLabel} • ` : ""}
                {formatted}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Check
      className={`h-3 w-3 opacity-70 ${className ?? ""}`}
      aria-label="Sent"
    />
  );
}
