"use client";

import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/components/providers/language-provider";

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title?: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  destructive = true,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleConfirm = useCallback(async () => {
    await onConfirm();
    setOpen(false);
  }, [onConfirm]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <div
        className="inline-flex"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        {trigger}
      </div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title || t("confirm.confirm")}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("confirm.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {t("confirm.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
