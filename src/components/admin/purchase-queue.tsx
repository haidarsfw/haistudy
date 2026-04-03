"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useTranslation } from "@/components/providers/language-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCart,
  Check,
  X,
  MessageCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { PurchaseRequest } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const PACKAGE_LABELS: Record<string, string> = {
  share: "Share (Rp20.000)",
  normal: "Normal (Rp25.000)",
  vip: "VIP (Rp30.000)",
  discount: "Diskon (Rp35.000)",
  free: "Free",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  approved: "bg-green-500/10 text-green-600",
  rejected: "bg-red-500/10 text-red-600",
};

export function PurchaseQueue() {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPurchases = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/purchase");
      const data = await res.json();
      setPurchases(data.purchases || []);
    } catch {
      toast.error("Gagal memuat purchase requests");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handleApprove = useCallback(async (purchase: PurchaseRequest) => {
    setProcessingId(purchase.id);

    // Generate license key
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newKey = `B29-${random}`;

    try {
      // Create the license key
      const createRes = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey,
          name: purchase.name,
          maxDevices: 2,
        }),
      });
      if (!createRes.ok) throw new Error("Failed to create key");

      // Update purchase status
      const patchRes = await fetch("/api/admin/purchase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: purchase.id,
          status: "approved",
          licenseKey: newKey,
        }),
      });
      if (!patchRes.ok) throw new Error("Failed to update purchase");

      const { purchase: updated } = await patchRes.json();
      setPurchases((prev) =>
        prev.map((p) => (p.id === purchase.id ? updated : p))
      );

      // Open WhatsApp
      let phone = purchase.whatsapp.replace(/\D/g, "");
      if (phone.startsWith("0")) phone = "62" + phone.slice(1);
      const message = `Halo ${purchase.name}! License key haistudy kamu sudah siap:\n\n🔐 ${newKey}\n\nSilakan login di https://haistudy.site`;
      window.open(
        `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`,
        "_blank"
      );

      toast.success(`Approved! Key: ${newKey}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal approve");
    }
    setProcessingId(null);
  }, []);

  const handleReject = useCallback(async (id: string) => {
    setProcessingId(id);

    try {
      const res = await fetch("/api/admin/purchase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "rejected" }),
      });
      const { purchase } = await res.json();
      setPurchases((prev) =>
        prev.map((p) => (p.id === id ? purchase : p))
      );
      toast.success("Purchase request ditolak");
    } catch {
      toast.error("Gagal menolak");
    }
    setProcessingId(null);
  }, []);

  const pendingCount = purchases.filter((p) => p.status === "pending").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Purchase Queue
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingCount}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={fetchPurchases}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : purchases.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada purchase request
          </p>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className={`rounded-lg border p-3 ${
                    purchase.status !== "pending" ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{purchase.name}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${STATUS_COLORS[purchase.status] || ""}`}
                        >
                          {purchase.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{purchase.whatsapp}</span>
                        {purchase.email && (
                          <span>&middot; {purchase.email}</span>
                        )}
                        <span>
                          &middot;{" "}
                          {PACKAGE_LABELS[purchase.package] || purchase.package}
                        </span>
                        <span>
                          &middot;{" "}
                          {formatDistanceToNow(new Date(purchase.createdAt), {
                            addSuffix: true,
                            locale: idLocale,
                          })}
                        </span>
                      </div>
                      {purchase.licenseKey && (
                        <p className="mt-1 text-xs">
                          Key:{" "}
                          <code className="font-semibold">
                            {purchase.licenseKey}
                          </code>
                        </p>
                      )}
                    </div>
                    {purchase.status === "pending" && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 gap-1 text-xs"
                          onClick={() => handleApprove(purchase)}
                          disabled={processingId === purchase.id}
                        >
                          {processingId === purchase.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Approve
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                              disabled={processingId === purchase.id}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          }
                          description={t("confirm.reject_purchase")}
                          onConfirm={() => handleReject(purchase.id)}
                        />
                      </div>
                    )}
                    {purchase.status === "approved" && purchase.whatsapp && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0"
                        onClick={() => {
                          let phone = purchase.whatsapp.replace(/\D/g, "");
                          if (phone.startsWith("0"))
                            phone = "62" + phone.slice(1);
                          window.open(
                            `https://api.whatsapp.com/send?phone=${phone}`,
                            "_blank"
                          );
                        }}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
