"use client";

import { useEffect, useState } from "react";
import { Newspaper } from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePatchNotes } from "@/hooks/use-patch-notes";
import {
  INTERRUPTION_PRIORITY,
  useInterruptionSlot,
} from "@/components/providers/interruption-provider";

/**
 * One-time "what's new" popup. Shows automatically the first time a user lands
 * on a new app version (after refreshing into it), then never repeats for that
 * version. Self-gates via usePatchNotes (onboarding-aware). Mount once in the
 * app shell. The same notes stay archived in the notification bell.
 */
export function PatchNotesPopup() {
  const { popupNotes, dismissPopup } = usePatchNotes();
  const [open, setOpen] = useState(false);

  // Last in the modal queue on purpose: a release note is the least urgent
  // thing anyone could be shown on arrival. If it loses its turn the notes stay
  // in the notification bell, which is where people look for them anyway.
  const { granted, release } = useInterruptionSlot("patch-notes", {
    lane: "modal",
    priority: INTERRUPTION_PRIORITY.patchNotes,
    ready: popupNotes.length > 0,
  });

  useEffect(() => {
    if (popupNotes.length > 0 && granted) setOpen(true);
  }, [popupNotes.length, granted]);

  const close = () => {
    setOpen(false);
    dismissPopup();
    release();
  };

  if (!granted) return null;
  if (popupNotes.length === 0 && !open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Newspaper className="h-4 w-4 shrink-0 text-primary" />
            Ada yang baru
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {popupNotes.map((note) => (
            <div key={note.version} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  v{note.version}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {note.title}
                </span>
              </div>
              <ul className="space-y-1.5">
                {note.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Button onClick={close} className="w-full">
          Oke, paham
        </Button>
      </DialogContent>
    </Dialog>
  );
}
