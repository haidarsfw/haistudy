"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePatchNotes } from "@/hooks/use-patch-notes";

/**
 * One-time "what's new" popup. Shows automatically the first time a user lands
 * on a new app version (after refreshing into it), then never repeats for that
 * version. Self-gates via usePatchNotes (onboarding-aware). Mount once in the
 * app shell. The same notes stay archived in the notification bell.
 */
export function PatchNotesPopup() {
  const { popupNotes, dismissPopup } = usePatchNotes();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (popupNotes.length > 0) setOpen(true);
  }, [popupNotes.length]);

  const close = () => {
    setOpen(false);
    dismissPopup();
  };

  if (popupNotes.length === 0 && !open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
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
