"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Search,
  Trash2,
  RotateCcw,
  ChevronDown,
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

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "Semua",
  pending: "Pending",
  approved: "Approved",
  rejected: "Ditolak",
};

export function PurchaseQueue({ reloadToken = 0 }: { reloadToken?: number }) {
  const { t } = useTranslation();
  const { adminScopeKey, isAllPeriods, scopeQuery, hydrated } = useAdminScope();
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [view, setView] = useState<"queue" | "summary">("queue");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "amount">("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
  }, [fetchPurchases, adminScopeKey, reloadToken]);

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

    const orderNo = purchase.meta?.orderNo;
    const invoiceTag = orderNo ? `Invoice #${String(orderNo).padStart(3, "0")}\n` : "";
    const pkgName =
      ({ share: "Share", normal: "Normal", vip: "VIP", diamond: "Diamond" } as Record<string, string>)[
        purchase.package
      ] ?? purchase.package;
    const amount =
      typeof purchase.meta?.uniqueAmount === "number"
        ? `Rp ${purchase.meta.uniqueAmount.toLocaleString("id-ID")}`
        : "—";

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
          ? `Halo ${purchase.name}, pesanan kamu sudah aktif ✅\n\n` +
            `Login: haistudy.site/login → "Login dengan Google" → pilih ${gmail}.\n` +
            `Setelah masuk, kirim screenshot Dashboard ke chat ini untuk validasi device.\n\n` +
            `Paket ${pkgName} · ${amount} · ${periode}\n` +
            `${invoiceTag.trim()}\n` +
            `Ada kendala? Balas chat ini.`
          : `Halo ${purchase.name}, pesanan kamu sudah aktif ✅\n\n` +
            `License key: ${newKey}\n` +
            `Login: haistudy.site/login → tempel key.\n` +
            `Setelah masuk, kirim screenshot Dashboard ke chat ini untuk validasi device.\n\n` +
            `Paket ${pkgName} · ${amount} · ${periode}\n` +
            `${invoiceTag.trim()}\n` +
            `Jangan bagikan key-mu. Ada kendala? Balas chat ini.`;
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

  const handleDelete = useCallback(async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/purchase${scopeQuery()}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      toast.success("Order dihapus");
    } catch {
      toast.error("Gagal menghapus order");
    }
    setProcessingId(null);
  }, [scopeQuery]);

  // Client-side search + status filter + sort over the fetched list.
  const visible = useMemo(() => {
    let list = purchases;
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = [
          p.name,
          p.whatsapp,
          p.email,
          p.meta?.loginEmail,
          p.licenseKey,
          p.meta?.classCode,
          p.meta?.campus,
          p.meta?.source,
          p.package,
          p.createdAt,
          new Date(p.createdAt).toLocaleString("id-ID"),
          typeof p.meta?.uniqueAmount === "number" ? String(p.meta.uniqueAmount) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const sorted = [...list];
    if (sort === "oldest") {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sort === "amount") {
      sorted.sort((a, b) => (b.meta?.uniqueAmount ?? 0) - (a.meta?.uniqueAmount ?? 0));
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [purchases, query, statusFilter, sort]);

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
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline" className="gap-1.5" disabled={!hydrated || isAllPeriods}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Invoice
            </Button>
          }
          description={`Reset nomor invoice untuk ${adminScopeKey} kembali ke #001? Order lama tetap tersimpan; hanya penomoran berikutnya yang di-reset.`}
          onConfirm={async () => {
            const res = await fetch(`/api/admin/invoice-counter${scopeQuery()}`, { method: "POST" });
            if (res.ok) toast.success("Nomor invoice di-reset ke #001");
            else toast.error("Gagal reset invoice");
          }}
        />
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
          <>
            {/* Search + status filter + sort */}
            <div className="mb-3 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama, WhatsApp, email, key, kelas, sumber, tanggal…"
                  className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none transition-colors focus:border-primary/50"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      statusFilter === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {STATUS_FILTER_LABELS[s]}
                  </button>
                ))}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="ml-auto h-7 rounded-md border border-border bg-background px-2 text-xs outline-none"
                  aria-label="Urutkan"
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="amount">Nominal tertinggi</option>
                </select>
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada hasil untuk filter ini
              </p>
            ) : (
              <ScrollArea className="max-h-[560px]">
                <div className="space-y-2">
                  {visible.map((purchase) => {
                    const expanded = expandedId === purchase.id;
                    return (
                      <div key={purchase.id} className="overflow-hidden rounded-lg border border-border">
                        {/* Clickable summary row → toggles full detail */}
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : purchase.id)}
                          className="flex w-full items-start justify-between gap-2 p-3 text-left transition-colors hover:bg-muted/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{purchase.name}</span>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${STATUS_COLORS[purchase.status] || ""}`}
                              >
                                {purchase.status}
                              </Badge>
                              {isAllPeriods && (
                                <Badge variant="outline" className="font-mono text-[10px]">
                                  s{purchase.semester}-{purchase.examPeriod}-{purchase.jurusan}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span>{PACKAGE_LABELS[purchase.package] || purchase.package}</span>
                              {purchase.meta?.classCode && <span>· {purchase.meta.classCode}</span>}
                              {purchase.meta?.campus && <span>· {purchase.meta.campus}</span>}
                              {purchase.meta?.deviceLimit && <span>· {purchase.meta.deviceLimit} device</span>}
                              {purchase.meta?.paymentMethod && <span>· {purchase.meta.paymentMethod.toUpperCase()}</span>}
                              <span>
                                ·{" "}
                                {formatDistanceToNow(new Date(purchase.createdAt), {
                                  addSuffix: true,
                                  locale: idLocale,
                                })}
                              </span>
                            </div>
                            {purchase.licenseKey && (
                              <p className="mt-1 text-xs">
                                Key: <code className="font-semibold">{purchase.licenseKey}</code>
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {typeof purchase.meta?.uniqueAmount === "number" && (
                              <span className="text-sm font-bold text-foreground">
                                Rp {purchase.meta.uniqueAmount.toLocaleString("id-ID")}
                              </span>
                            )}
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                          </div>
                        </button>

                        {/* Full detail (all fields + larger proofs) */}
                        {expanded && (
                          <div className="border-t border-border/60 bg-muted/20 px-3 pb-3 pt-2.5">
                            <div className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                              <DetailRow label="WhatsApp" value={purchase.whatsapp} />
                              <DetailRow label="Email kontak" value={purchase.email || "—"} />
                              <DetailRow
                                label="Metode login"
                                value={purchase.meta?.loginMethod === "email" ? "Google (Email)" : "License Key"}
                              />
                              {purchase.meta?.loginEmail && (
                                <DetailRow label="Email Google" value={purchase.meta.loginEmail} />
                              )}
                              {typeof purchase.meta?.basePrice === "number" && (
                                <DetailRow label="Harga dasar" value={`Rp ${purchase.meta.basePrice.toLocaleString("id-ID")}`} />
                              )}
                              {typeof purchase.meta?.uniqueAmount === "number" && (
                                <DetailRow label="Nominal unik" value={`Rp ${purchase.meta.uniqueAmount.toLocaleString("id-ID")}`} />
                              )}
                              <DetailRow label="Kelas" value={purchase.meta?.classCode || "—"} />
                              <DetailRow label="Kampus" value={purchase.meta?.campus || "—"} />
                              <DetailRow label="Sumber" value={purchase.meta?.source || "—"} />
                              {purchase.meta?.shareMethod && (
                                <DetailRow
                                  label="Metode share"
                                  value={purchase.meta.shareMethod === "story" ? "Instagram Story" : "Broadcast"}
                                />
                              )}
                              <DetailRow
                                label="Periode"
                                value={`s${purchase.semester}-${purchase.examPeriod}-${purchase.jurusan}`}
                              />
                              <DetailRow label="Dibuat" value={new Date(purchase.createdAt).toLocaleString("id-ID")} />
                              {purchase.approvedAt && (
                                <DetailRow label="Disetujui" value={new Date(purchase.approvedAt).toLocaleString("id-ID")} />
                              )}
                              {purchase.meta?.leShareNote && (
                                <DetailRow label="Catatan LE86" value={purchase.meta.leShareNote} />
                              )}
                            </div>

                            {(purchase.paymentProofUrl || purchase.shareProofUrl || purchase.shareProofUrl2) && (
                              <div className="mt-3 flex flex-wrap gap-3">
                                {purchase.paymentProofUrl && (
                                  <ProofThumb src={purchase.paymentProofUrl} label="Bukti Bayar" onClick={() => setPreviewSrc(purchase.paymentProofUrl!)} />
                                )}
                                {purchase.shareProofUrl && (
                                  <ProofThumb src={purchase.shareProofUrl} label="Bukti Share #1" onClick={() => setPreviewSrc(purchase.shareProofUrl!)} />
                                )}
                                {purchase.shareProofUrl2 && (
                                  <ProofThumb src={purchase.shareProofUrl2} label="Bukti Share #2" onClick={() => setPreviewSrc(purchase.shareProofUrl2!)} />
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 px-3 py-2">
                          {purchase.status === "pending" && (
                            <>
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
                                    <X className="h-3 w-3" /> Tolak
                                  </Button>
                                }
                                description={t("confirm.reject_purchase")}
                                onConfirm={() => handleReject(purchase.id)}
                              />
                            </>
                          )}
                          {purchase.status === "approved" && purchase.whatsapp && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-xs"
                              onClick={() => {
                                let phone = purchase.whatsapp.replace(/\D/g, "");
                                if (phone.startsWith("0")) phone = "62" + phone.slice(1);
                                window.open(`https://api.whatsapp.com/send?phone=${phone}`, "_blank");
                              }}
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </Button>
                          )}
                          {purchase.status === "rejected" && (
                            <ConfirmDialog
                              trigger={
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                                  disabled={processingId === purchase.id}
                                >
                                  <Trash2 className="h-3 w-3" /> Hapus
                                </Button>
                              }
                              description={t("confirm.delete_purchase")}
                              onConfirm={() => handleDelete(purchase.id)}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </CardContent>
    </Card>
    )}
    <MediaPreviewer src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/40 py-0.5 last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function ProofThumb({ src, label, onClick }: { src: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group/proof flex flex-col items-center gap-1" title={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        className="h-24 w-24 rounded-md border border-border object-cover transition-opacity group-hover/proof:opacity-80"
      />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </button>
  );
}
