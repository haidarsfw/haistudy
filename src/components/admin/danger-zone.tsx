"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface DangerAction {
  id: string;
  label: string;
  description: string;
  confirmText: string;
  action: () => Promise<void>;
}

export function DangerZone({
  purchaseScopeKey,
  purchaseIsAllPeriods,
  purchaseScopeQuery,
  onPurchasesCleared,
}: {
  purchaseScopeKey?: string;
  purchaseIsAllPeriods?: boolean;
  purchaseScopeQuery?: () => string;
  onPurchasesCleared?: () => void;
} = {}) {
  const [activeAction, setActiveAction] = useState<DangerAction | null>(null);
  const [step, setStep] = useState(0); // 0=closed, 1=confirm, 2=type, 3=executing
  const [typed, setTyped] = useState("");

  // "Hapus Semua Order" is SCOPED to the selected period (unlike the global log
  // actions below). Hidden in the All-periods view — clearing every period at
  // once is intentionally not offered. The type-to-confirm string is the scope key.
  const clearPurchasesAction: DangerAction | null =
    purchaseScopeQuery && purchaseScopeKey && !purchaseIsAllPeriods
      ? {
          id: "clear-purchases",
          label: `Hapus Semua Order — ${purchaseScopeKey}`,
          description:
            "Hapus SEMUA purchase order di periode ini (termasuk yang sudah di-approve) beserta bukti pembayaran & share-nya. Tidak bisa dikembalikan.",
          confirmText: purchaseScopeKey,
          action: async () => {
            const res = await fetch(`/api/admin/purchase${purchaseScopeQuery()}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "clearAll" }),
            });
            if (!res.ok) throw new Error();
            onPurchasesCleared?.();
          },
        }
      : null;

  // Danger Zone operates GLOBALLY - affects all scopes. Use the explicit
  // ?allPeriods=1 query so the server records the intent.
  const actions: DangerAction[] = [
    ...(clearPurchasesAction ? [clearPurchasesAction] : []),
    {
      id: "clear-activity",
      label: "Clear Activity Logs (GLOBAL)",
      description: "Hapus semua activity logs LINTAS scope. Data tidak bisa dikembalikan.",
      confirmText: "CLEAR ACTIVITY",
      action: async () => {
        const res = await fetch("/api/admin/logs?allPeriods=1", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "activity" }),
        });
        if (!res.ok) throw new Error();
      },
    },
    {
      id: "clear-errors",
      label: "Clear Error Logs (GLOBAL)",
      description: "Hapus semua error logs LINTAS scope. Data tidak bisa dikembalikan.",
      confirmText: "CLEAR ERRORS",
      action: async () => {
        const res = await fetch("/api/admin/logs?allPeriods=1", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "error" }),
        });
        if (!res.ok) throw new Error();
      },
    },
  ];

  const handleOpen = useCallback((action: DangerAction) => {
    setActiveAction(action);
    setStep(1);
    setTyped("");
  }, []);

  const handleConfirmStep1 = useCallback(() => {
    setStep(2);
  }, []);

  const handleExecute = useCallback(async () => {
    if (!activeAction || typed !== activeAction.confirmText) return;
    setStep(3);

    try {
      await activeAction.action();
      toast.success(`${activeAction.label} berhasil`);
    } catch {
      toast.error(`Gagal: ${activeAction.label}`);
    }

    setStep(0);
    setActiveAction(null);
    setTyped("");
  }, [activeAction, typed]);

  const handleClose = useCallback(() => {
    setStep(0);
    setActiveAction(null);
    setTyped("");
  }, []);

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
            ⚠️ Aksi log di sini bersifat <span className="font-bold">GLOBAL</span> - berlaku lintas semua scope (UTS, UAS, semua jurusan, semua semester). Khusus <span className="font-bold">&ldquo;Hapus Semua Order&rdquo;</span> hanya berlaku untuk periode yang dipilih di header admin.
          </div>
          {actions.map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between rounded-lg border border-destructive/20 p-3"
            >
              <div>
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleOpen(action)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Execute
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3-step confirmation dialog */}
      <Dialog open={step > 0} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {activeAction?.label}
            </DialogTitle>
            <DialogDescription>
              {activeAction?.description}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm">
                Apakah kamu yakin? Tindakan ini tidak bisa dibatalkan.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Batal
                </Button>
                <Button variant="destructive" onClick={handleConfirmStep1}>
                  Ya, lanjutkan
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm">
                Ketik{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-bold text-destructive">
                  {activeAction?.confirmText}
                </code>{" "}
                untuk konfirmasi:
              </p>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={activeAction?.confirmText}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  disabled={typed !== activeAction?.confirmText}
                  onClick={handleExecute}
                >
                  Konfirmasi
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-destructive" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
