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
  ListChecks,
  BarChart3,
  Download,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { PurchaseRequest } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAdminScope } from "@/components/providers/admin-scope-provider";
import { scopeKey, scopeFullLabel } from "@/lib/scope";
import { MediaPreviewer } from "@/components/shared/media-previewer";
import { PurchaseSummary } from "@/components/admin/purchase-summary";

const PACKAGE_LABELS: Record<string, string> = {
  share: "Share (Rp25.000)",
  normal: "Normal (Rp30.000)",
  vip: "VIP (Rp35.000)",
  diamond: "Diamond (Rp50.000)",
  discount: "Diskon (legacy)",
  free: "Free",
};

// Purchase package → license_keys.package_tier granted on approval.
const TIER_MAP: Record<string, "share" | "normal" | "vip" | "diamond"> = {
  share: "share",
  normal: "normal",
  vip: "vip",
  diamond: "diamond",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  approved: "bg-green-500/10 text-green-600",
  rejected: "bg-red-500/10 text-red-600",
};

export function PurchaseQueue() {
  const { t } = useTranslation();
  const { adminScopeKey, isAllPeriods, scopeQuery, hydrated } = useAdminScope();
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [view, setView] = useState<"queue" | "summary">("queue");

  const exportFile = useCallback(
    (format: "csv" | "xlsx") => {
      const q = scopeQuery();
      if (!q) return; // not hydrated yet
      const url = `/api/admin/purchase/export${q}&format=${format}`;
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    [scopeQuery]
  );

  const fetchPurchases = useCallback(async () => {
    if (!hydrated) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/purchase${scopeQuery()}`);
      const data = await res.json();
      setPurchases(data.purchases || []);
    } catch {
      toast.error("Gagal memuat purchase requests");
    }
    setLoading(false);
  }, [hydrated, scopeQuery]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases, adminScopeKey]);

  const handleApprove = useCallback(async (purchase: PurchaseRequest) => {
    setProcessingId(purchase.id);

    // Generate license key
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newKey = `B29-${random}`;

    // License inherits the PURCHASE row's scope (not admin selection).
    const purchaseScopeKey = scopeKey({
      semester: purchase.semester,
      examPeriod: purchase.examPeriod,
      jurusan: purchase.jurusan,
    });

    // Grant the tier the buyer actually paid for + the device limit they
    // requested. Without these the key silently defaulted to Normal / 2 devices.
    const packageTier = TIER_MAP[purchase.package] ?? "normal";
    const maxDevices = purchase.meta?.deviceLimit ?? 2;

    // Login-method binding: 'email' buyers log in via Google (link the Gmail so
    // the oauth_links row is created); 'key' buyers log in with the license key.
    const loginMethod = purchase.meta?.loginMethod === "email" ? "email" : "key";
    const gmail = (purchase.meta?.loginEmail || purchase.email || "").trim();
    const periode = scopeFullLabel({
      semester: purchase.semester,
      examPeriod: purchase.examPeriod,
      jurusan: purchase.jurusan,
    });

    // Email-login buyer with no Gmail on file would mint a locked-out key. Stop here.
    if (loginMethod === "email" && !gmail) {
      toast.error("Pembeli pilih login via Google tapi email Gmail kosong. Perbaiki data pembeli dulu.");
      setProcessingId(null);
      return;
    }

    try {
      // Create the license key in the purchase's scope
      const createRes = await fetch(`/api/admin/licenses?scope=${purchaseScopeKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey,
          name: purchase.name,
          packageTier,
          maxDevices,
          scope: purchaseScopeKey,
          loginMethod,
          ...(loginMethod === "email" && gmail ? { linkedEmail: gmail } : {}),
        }),
      });
      if (!createRes.ok) throw new Error("Failed to create key");

      // Update purchase status
      const patchRes = await fetch(`/api/admin/purchase${scopeQuery()}`, {
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

      // Open WhatsApp with a clean, copy-friendly activation message,
      // branched by the buyer's login method.
      let phone = purchase.whatsapp.replace(/\D/g, "");
      if (phone.startsWith("0")) phone = "62" + phone.slice(1);
      const message =
        loginMethod === "email"
          ? `Halo ${purchase.name}! 🎉 Pembelian haistudy kamu sudah aktif.\n\n` +
            `Cara login:\n` +
            `1. Buka https://haistudy.site/login\n` +
            `2. Klik "Login dengan Google"\n` +
            `3. Pilih email: ${gmail}\n\n` +
            `Periode: ${periode}\n\n` +
            `Akunmu sudah terhubung ke email itu. Butuh bantuan? Balas chat ini.`
          : `Halo ${purchase.name}! 🎉 Pembelian haistudy kamu sudah aktif.\n\n` +
            `🔑 License Key:\n${newKey}\n\n` +
            `Cara login:\n` +
            `1. Buka https://haistudy.site/login\n` +
            `2. Tempel license key di atas\n` +
            `3. Masuk & mulai belajar\n\n` +
            `Periode: ${periode}\n\n` +
            `Simpan key ini baik-baik. Butuh bantuan? Balas chat ini.`;
      window.open(
        `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`,
        "_blank"
      );

      toast.success(`Approved! Key: ${newKey}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal approve");
    }
    setProcessingId(null);
  }, [scopeQuery]);

  const handleReject = useCallback(async (id: string) => {
    setProcessingId(id);

    try {
      const res = await fetch(`/api/admin/purchase${scopeQuery()}`, {
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
  }, [scopeQuery]);

  const pendingCount = purchases.filter((p) => p.status === "pending").length;

  return (
    <>
    {/* View toggle (Antrian | Ringkasan) + export */}
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-border p-0.5">
        <button
          type="button"
          onClick={() => setView("queue")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "queue" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListChecks className="h-3.5 w-3.5" />
          Antrian
        </button>
        <button
          type="button"
          onClick={() => setView("summary")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "summary" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Ringkasan
        </button>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportFile("csv")} disabled={!hydrated}>
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportFile("xlsx")} disabled={!hydrated}>
          <Download className="h-3.5 w-3.5" />
          XLSX
        </Button>
      </div>
    </div>

    {view === "summary" ? (
      <PurchaseSummary purchases={purchases} />
    ) : (
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
                        {isAllPeriods && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            s{purchase.semester}-{purchase.examPeriod}-{purchase.jurusan}
                          </Badge>
                        )}
                      </div>
                      {purchase.licenseKey && (
                        <p className="mt-1 text-xs">
                          Key:{" "}
                          <code className="font-semibold">
                            {purchase.licenseKey}
                          </code>
                        </p>
                      )}
                      {purchase.meta && (
                        <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                          {purchase.meta.classCode && <span>Kelas: {purchase.meta.classCode}</span>}
                          {purchase.meta.campus && <span>&middot; {purchase.meta.campus}</span>}
                          {purchase.meta.deviceLimit && <span>&middot; {purchase.meta.deviceLimit} device</span>}
                          {purchase.meta.paymentMethod && <span>&middot; {purchase.meta.paymentMethod.toUpperCase()}</span>}
                          {typeof purchase.meta.uniqueAmount === "number" && (
                            <span className="font-medium text-foreground">
                              &middot; Rp {purchase.meta.uniqueAmount.toLocaleString("id-ID")}
                            </span>
                          )}
                          {purchase.meta.source && <span>&middot; via {purchase.meta.source}</span>}
                        </div>
                      )}
                      {(purchase.paymentProofUrl || purchase.shareProofUrl) && (
                        <div className="mt-2 flex gap-2">
                          {purchase.paymentProofUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewSrc(purchase.paymentProofUrl!)}
                              className="group/proof flex flex-col items-center gap-0.5"
                              title="Lihat bukti pembayaran"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={purchase.paymentProofUrl}
                                alt="Bukti bayar"
                                className="h-14 w-14 rounded-md border border-border object-cover transition-opacity group-hover/proof:opacity-80"
                              />
                              <span className="text-[9px] text-muted-foreground">Bayar</span>
                            </button>
                          )}
                          {purchase.shareProofUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewSrc(purchase.shareProofUrl!)}
                              className="group/proof flex flex-col items-center gap-0.5"
                              title="Lihat bukti share"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={purchase.shareProofUrl}
                                alt="Bukti share"
                                className="h-14 w-14 rounded-md border border-border object-cover transition-opacity group-hover/proof:opacity-80"
                              />
                              <span className="text-[9px] text-muted-foreground">Share</span>
                            </button>
                          )}
                        </div>
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
    )}
    <MediaPreviewer src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </>
  );
}
