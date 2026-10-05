"use client";

import { useState } from "react";
import { Copy, Download, Maximize2, QrCode } from "@/components/ui/icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PAYMENT_ACCOUNTS } from "@/lib/payments";
import { cn } from "@/lib/utils";

/**
 * Where to send the money: the bank and e-wallet rows and the QRIS card.
 * Shared by checkout and the in-app package upgrade, so both show the same
 * accounts the same way.
 */

export function AccountRow({
  icon,
  label,
  number,
  holder,
  onCopy,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  number: string;
  holder: string;
  onCopy: () => void;
  hint: string;
}) {
  // Whole row is the copy target — tap anywhere to copy the number.
  return (
    <button
      type="button"
      onClick={onCopy}
      title={hint}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm font-semibold text-foreground">{number}</p>
        <p className="truncate text-[11px] text-muted-foreground">a.n. {holder}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground transition-colors group-hover:text-foreground">
        <Copy className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{hint}</span>
      </span>
    </button>
  );
}

/**
 * QRIS row. No thumbnail: a 64px crop of a QR is unscannable and unreadable, so
 * it was decoration that cost a fetch. The two things a buyer actually does are
 * explicit instead — save it to scan from another device (labelled, because it
 * is the primary action), or open it inline to scan right here (icon only).
 */
export function QrisCard({
  label,
  expandHint,
  openHint,
  downloadLabel,
}: {
  label: string;
  /** Shown on the closed card. Tells you what tapping does. */
  expandHint: string;
  /** Shown inside the open dialog. Telling someone to "tap to enlarge" after
   *  they already tapped and it is already enlarged is instruction for a step
   *  they just finished. */
  openHint: string;
  downloadLabel: string;
}) {
  const [broken, setBroken] = useState(false);
  const [open, setOpen] = useState(false);

  // A window, not an accordion.
  //
  // Opening it in place added roughly 300px between the buyer and the Continue
  // button they were about to press — so the button moved out from under a
  // thumb that was already travelling towards it. A QR code is also the one
  // thing here you want as large as the screen allows, which an inline panel
  // squeezed into a column can never be.
  return (
    <>
      <button
        type="button"
        onClick={() => !broken && setOpen(true)}
        disabled={broken}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-colors",
          !broken &&
            "hover:border-primary/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        )}
      >
        <QrCode className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">QRIS</p>
          <p className="text-[11px] text-muted-foreground">{broken ? label : expandHint}</p>
        </div>
        {!broken && (
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QRIS</DialogTitle>
            <DialogDescription>{openHint}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PAYMENT_ACCOUNTS.qrisImage}
              alt="QRIS haistudy, scan untuk bayar"
              onError={() => {
                setBroken(true);
                setOpen(false);
              }}
              className="w-full max-w-[18rem] rounded-lg border border-border object-contain"
            />
          </div>
          <a
            href={PAYMENT_ACCOUNTS.qrisImage}
            download="qris-haistudy.jpg"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Download className="h-4 w-4" />
            {downloadLabel}
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
