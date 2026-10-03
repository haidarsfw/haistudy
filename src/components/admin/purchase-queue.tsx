"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useTranslation } from "@/components/providers/language-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  MailWarning,
  Clock,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { PurchaseRequest } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  useAdminPurchaseCount,
  ALL_PERIODS_COUNT_QUERY,
} from "@/hooks/use-admin-purchase-count";
import { useAdminScope } from "@/components/providers/admin-scope-provider";
import { scopeFullLabel } from "@/lib/scope";
import { buildApprovalWa } from "@/lib/wa-message";
import { firstWord } from "@/lib/name";
import { MediaPreviewer } from "@/components/shared/media-previewer";
import { PurchaseSummary } from "@/components/admin/purchase-summary";
import { adminFetch } from "@/lib/admin/admin-fetch";
import { AdminErrorBanner } from "@/components/admin/admin-error-banner";
import { loginMethodLabel } from "@/lib/auth/login-method";

/**
 * How close a pending order is to the 24-hour promise.
 *
 * /payments tells every buyer: checked within 1x24 jam, and if it is not, they
 * are owed a partial refund plus login access. Nothing measured that. The age
 * was on screen, but as one grey item in a row of six, next to the class and
 * the payment method — so an order 23 hours old looked exactly like one that
 * arrived at breakfast.
 *
 * Purely derived from created_at at render time: no column, no cron, no query.
 */
function slaState(createdAt: string): { level: "ok" | "soon" | "late"; hours: number } {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (hours >= 24) return { level: "late", hours };
  if (hours >= 12) return { level: "soon", hours };
  return { level: "ok", hours };
}

const SLA_BADGE: Record<"ok" | "soon" | "late", string> = {
  ok: "border-border text-muted-foreground",
  soon: "border-warning/40 text-warning",
  late: "border-destructive/50 text-destructive",
};

const PACKAGE_LABELS: Record<string, string> = {
  share: "Share (Rp25.000)",
  normal: "Normal (Rp30.000)",
  vip: "VIP (Rp35.000)",
  diamond: "Diamond (Rp50.000)",
  discount: "Diskon (legacy)",
  free: "Free",
  exam_quota: "Top-up Kuota",
  upgrade: "Naik paket",
};

const TIER_NAMES: Record<string, string> = { share: "Share", normal: "Normal", vip: "VIP", diamond: "Diamond" };

// The package → tier map, the scope helper and the login-method resolver all
// moved to /api/admin/purchase/approve along with the approval itself.

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

// Rebuild the EXACT approval/invoice WhatsApp message from an approved purchase
// row (key, invoice no, package, amount, login method, scope). Used by BOTH the
// approve flow and the resend button so a lost WA message can be re-sent in full.
function waMessageForApprovedPurchase(purchase: PurchaseRequest): string {
  const loginMethod = purchase.meta?.loginMethod ?? "key";
  const gmail = (purchase.meta?.loginEmail || purchase.email || "").trim();
  const periode = scopeFullLabel({
    semester: purchase.semester,
    examPeriod: purchase.examPeriod,
    jurusan: purchase.jurusan,
  });
  const pkgName =
    ({ share: "Share", normal: "Normal", vip: "VIP", diamond: "Diamond" } as Record<string, string>)[
      purchase.package
    ] ?? purchase.package;
  const amount =
    typeof purchase.meta?.uniqueAmount === "number"
      ? `Rp ${purchase.meta.uniqueAmount.toLocaleString("id-ID")}`
      : "—";
  return buildApprovalWa({
    nickname: purchase.meta?.nickname || firstWord(purchase.name),
    invoiceNo: purchase.meta?.orderNo ?? 1,
    loginMethod,
    licenseKey: purchase.licenseKey ?? "",
    gmail,
    pkgLabel: pkgName,
    amount,
    periode,
  });
}

// Normalize a WhatsApp number to the wa.me format (leading 0 → 62).
function waPhone(whatsapp: string): string {
  let phone = whatsapp.replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  return phone;
}

export function PurchaseQueue({ reloadToken = 0 }: { reloadToken?: number }) {
  const { t } = useTranslation();
  const { adminScopeKey, isAllPeriods, scopeQuery, hydrated, setAdminScope } =
    useAdminScope();
  // Shares the badge's poller (same URL key), so this costs no extra requests.
  const { pendingCount: pendingEverywhere } = useAdminPurchaseCount({
    scopeQuery: ALL_PERIODS_COUNT_QUERY,
  });
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [view, setView] = useState<"queue" | "summary">("queue");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "amount">("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Delete confirmation target. Approved orders get an extra choice (revoke key).
  const [deleteTarget, setDeleteTarget] = useState<PurchaseRequest | null>(null);
  /** Set only when approving something whose buyer has not confirmed their e-mail. */
  const [approveTarget, setApproveTarget] = useState<PurchaseRequest | null>(null);

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
    setError(null);
    try {
      const data = await adminFetch<{ purchases?: PurchaseRequest[] }>(
        `/api/admin/purchase${scopeQuery()}`
      );
      setPurchases(data.purchases || []);
    } catch (e) {
      setError(e);
    }
    setLoading(false);
  }, [hydrated, scopeQuery]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases, adminScopeKey, reloadToken]);

  const handleApprove = useCallback(async (
    purchase: PurchaseRequest,
    // Set only by the "setujui paksa" path in the dialog below. The server
    // refuses an unconfirmed address without it, so this flag is the whole
    // difference between a checked approval and a deliberate exception.
    overrideUnverified = false
  ) => {
    setProcessingId(purchase.id);

    // Package upgrade: the buyer's EXISTING access goes up a tier. No key is
    // minted; the server raises the tier and tells the buyer in the app.
    if (purchase.package === "upgrade") {
      try {
        const res = await fetch(`/api/admin/purchase${scopeQuery()}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: purchase.id, status: "approved" }),
        });
        const body = (await res.json().catch(() => ({}))) as { purchase?: PurchaseRequest; error?: string };
        if (!res.ok || !body.purchase) throw new Error(body.error || "Gagal menyetujui naik paket");
        setPurchases((prev) => prev.map((p) => (p.id === purchase.id ? body.purchase! : p)));
        const from = TIER_NAMES[purchase.meta?.fromTier ?? ""] ?? "?";
        const to = TIER_NAMES[purchase.meta?.toTier ?? ""] ?? "?";
        toast.success(`Naik paket disetujui: ${from} → ${to}. Pembeli dapat kabar di aplikasi.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal approve");
      }
      setProcessingId(null);
      return;
    }

    // Exam-quota top-up: the buyer already has a key — no new key minted. Just
    // approve; the server adds the bonus credits + sends the in-app confirmation.
    if (purchase.package === "exam_quota") {
      try {
        const res = await fetch(`/api/admin/purchase${scopeQuery()}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: purchase.id, status: "approved" }),
        });
        if (!res.ok) throw new Error("Failed to update purchase");
        const { purchase: updated } = await res.json();
        setPurchases((prev) => prev.map((p) => (p.id === purchase.id ? updated : p)));
        toast.success(`Top-up ${purchase.meta?.quotaQty ?? ""}× disetujui — kuota ditambahkan.`);

        // WhatsApp a quota-specific confirmation to the buyer's phone (from their
        // profile, stored at top-up). Different message from the access invoice;
        // no key/invoice. Skipped silently when no phone is on file.
        const phone = waPhone((updated as PurchaseRequest).whatsapp || purchase.whatsapp || "");
        if (phone.length >= 8) {
          const subj = purchase.meta?.subjectName || "mata kuliah";
          const qty = purchase.meta?.quotaQty ?? "";
          const msg =
            `Halo ${purchase.name || ""}, top-up kuota latihan kamu untuk ${subj} (${qty}× attempt) sudah disetujui. ✅\n\n` +
            `Kuotanya langsung ditambahkan dan bisa dipakai sekarang lewat menu Latihan Soal. Selamat berlatih, terima kasih sudah mendukung HaiStudy!`;
          window.open(
            `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`,
            "_blank"
          );
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal approve");
      }
      setProcessingId(null);
      return;
    }

    // One server call does the whole approval: mint the key, attach it to the
    // buyer's account, stamp the invoice number, mark the purchase approved,
    // and send the "aksesmu sudah aktif" mail.
    //
    // It used to be two fetches from here. When the second failed, a live key
    // existed while the purchase still read "pending", and approving again
    // minted a SECOND key for the same buyer. The key was also
    // `Math.random()` with a hardcoded B29- prefix; the server uses the real
    // collision-checked generator.
    try {
      const res = await fetch("/api/admin/purchase/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: purchase.id, overrideUnverified }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        licenseKey?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal approve");
      }

      // Re-read the row so the WhatsApp message is built from exactly what the
      // server stored (invoice number included), byte-identical to what the
      // resend button reproduces later.
      const listRes = await fetch(`/api/admin/purchase${scopeQuery()}`);
      const list = (await listRes.json()) as { purchases?: PurchaseRequest[] };
      const updated = list.purchases?.find((p) => p.id === purchase.id);
      if (updated) {
        setPurchases((prev) => prev.map((p) => (p.id === purchase.id ? updated : p)));
        window.open(
          `https://api.whatsapp.com/send?phone=${waPhone(purchase.whatsapp)}&text=${encodeURIComponent(
            waMessageForApprovedPurchase(updated)
          )}`,
          "_blank"
        );
      }

      toast.success(`Disetujui. Key: ${data.licenseKey}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal approve");
    }
    setProcessingId(null);
  }, [scopeQuery]);

  /**
   * Approve, unless the buyer's e-mail is still unconfirmed.
   *
   * A warning with a way past it, not a locked button. Confirming an address is
   * a condition on approval because it keeps fake signups out of the queue —
   * but the person who paid is real, and a hard block would leave the owner
   * unable to serve a paying customer whose mail simply never arrived. So the
   * default answer is "not yet" and the override is one click away, deliberately
   * with a stop in between so it is never the thing you do by reflex.
   */
  const requestApprove = useCallback(
    (purchase: PurchaseRequest) => {
      // `false` only. `null` means the row predates accounts and there is
      // nothing to check — flagging those would put a warning on all of history.
      if (purchase.emailVerified === false) {
        setApproveTarget(purchase);
        return;
      }
      void handleApprove(purchase);
    },
    [handleApprove]
  );

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

  const handleDelete = useCallback(async (id: string, revokeKey = false) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/purchase${scopeQuery()}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, revokeKey }),
      });
      if (!res.ok) throw new Error();
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      toast.success(revokeKey ? "Order dihapus & key dicabut" : "Order dihapus");
    } catch {
      toast.error("Gagal menghapus order");
    }
    setProcessingId(null);
  }, [scopeQuery]);

  // Open the delete dialog for any status. Approved orders offer the revoke-key
  // choice; pending/rejected get a plain confirm.
  const requestDelete = useCallback((purchase: PurchaseRequest) => {
    setDeleteTarget(purchase);
  }, []);

  const confirmDelete = useCallback(
    (revokeKey: boolean) => {
      if (!deleteTarget) return;
      const id = deleteTarget.id;
      setDeleteTarget(null);
      void handleDelete(id, revokeKey);
    },
    [deleteTarget, handleDelete]
  );

  // Client-side search + status filter + sort over the fetched list.
  const visible = useMemo(() => {
    let list = purchases;
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = [
          p.name,
          p.meta?.nickname,
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
    // Pending first, always, whatever the sort. The 24-hour promise is only
    // ever broken by a row that is waiting, and burying it under a page of
    // approved orders is how it gets broken.
    const byPending = (a: PurchaseRequest, b: PurchaseRequest) =>
      Number(b.status === "pending") - Number(a.status === "pending");
    if (sort === "oldest") {
      sorted.sort(
        (a, b) =>
          byPending(a, b) ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (sort === "amount") {
      sorted.sort(
        (a, b) => byPending(a, b) || (b.meta?.uniqueAmount ?? 0) - (a.meta?.uniqueAmount ?? 0)
      );
    } else {
      // Newest first WITHIN pending, so the oldest waiting order still surfaces
      // above every settled one.
      sorted.sort(
        (a, b) =>
          byPending(a, b) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return sorted;
  }, [purchases, query, statusFilter, sort]);

  const pendingCount = purchases.filter((p) => p.status === "pending").length;

  return (
    <>
    {error && <AdminErrorBanner error={error} onRetry={fetchPurchases} />}
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
      <PurchaseSummary purchases={purchases} onDelete={requestDelete} />
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
        {/* A scoped queue hides orders from every other period, and the admin
            lands on the newest sellable one by default. A B30 order could sit
            pending in s1-uts-bm with nothing on this screen to say so. */}
        {!isAllPeriods && pendingEverywhere > pendingCount && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <span>
              {pendingEverywhere - pendingCount} pesanan menunggu di periode
              lain.
            </span>
            <button
              type="button"
              onClick={() => setAdminScope("all")}
              className="rounded-full border border-amber-500/40 px-2 py-0.5 font-semibold hover:bg-amber-500/20"
            >
              Lihat semua periode
            </button>
          </div>
        )}
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
              <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
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
                              {/* Only on rows still waiting. Once approved the
                                  question is settled and the badge would just
                                  be a permanent accusation. */}
                              {/* The 24-hour clock, where it cannot be missed.
                                  Only on rows still waiting — once it is
                                  approved the clock stopped mattering. */}
                              {purchase.status === "pending" &&
                                (() => {
                                  const sla = slaState(purchase.createdAt);
                                  return (
                                    <Badge
                                      variant="outline"
                                      className={`gap-1 text-[10px] ${SLA_BADGE[sla.level]}`}
                                      title="Janji di /payments: dicek maksimal 1x24 jam"
                                    >
                                      <Clock className="h-3 w-3" />
                                      {sla.level === "late"
                                        ? `Lewat 24 jam (${Math.floor(sla.hours)} jam)`
                                        : `${Math.floor(sla.hours)} jam`}
                                    </Badge>
                                  );
                                })()}
                              {purchase.emailVerified === false &&
                                purchase.status === "pending" && (
                                  <Badge
                                    variant="outline"
                                    className="gap-1 border-warning/40 text-[10px] text-warning"
                                  >
                                    <MailWarning className="h-3 w-3" />
                                    Email belum dikonfirmasi
                                  </Badge>
                                )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span>{PACKAGE_LABELS[purchase.package] || purchase.package}</span>
                              {purchase.package === "upgrade" && (
                                <span>
                                  · {TIER_NAMES[purchase.meta?.fromTier ?? ""] ?? "?"} →{" "}
                                  {TIER_NAMES[purchase.meta?.toTier ?? ""] ?? "?"}
                                </span>
                              )}
                              {purchase.package === "exam_quota" && (
                                <>
                                  <span>· {purchase.meta?.quotaQty ?? "?"}× kuota</span>
                                  {purchase.meta?.subjectName && <span>· {purchase.meta.subjectName}</span>}
                                </>
                              )}
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
                            {typeof purchase.meta?.uniqueAmount === "number" ? (
                              <span className="text-sm font-bold text-foreground">
                                Rp {purchase.meta.uniqueAmount.toLocaleString("id-ID")}
                              </span>
                            ) : (
                              purchase.package === "exam_quota" &&
                              typeof purchase.meta?.basePrice === "number" && (
                                <span className="text-sm font-bold text-foreground">
                                  Rp {purchase.meta.basePrice.toLocaleString("id-ID")}
                                </span>
                              )
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
                                label="Cara masuk"
                                value={loginMethodLabel(purchase.meta?.loginMethod)}
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
                                onClick={() => requestApprove(purchase)}
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
                              title="Kirim ulang invoice lengkap via WhatsApp"
                              onClick={() => {
                                // Resend the FULL invoice (key, login steps, package,
                                // amount, periode) — same message as at approve time.
                                window.open(
                                  `https://api.whatsapp.com/send?phone=${waPhone(purchase.whatsapp)}&text=${encodeURIComponent(
                                    waMessageForApprovedPurchase(purchase)
                                  )}`,
                                  "_blank"
                                );
                              }}
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </Button>
                          )}
                          {/* Delete — available for ANY status (approved adds a revoke-key choice) */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto h-7 gap-1 text-xs text-destructive hover:text-destructive"
                            disabled={processingId === purchase.id}
                            onClick={() => requestDelete(purchase)}
                          >
                            <Trash2 className="h-3 w-3" /> Hapus
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
    )}
    <MediaPreviewer src={previewSrc} onClose={() => setPreviewSrc(null)} />

    {/* Delete confirmation — approved orders can also revoke the issued key */}
    <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {deleteTarget?.status === "approved" ? "Hapus order (approved)?" : "Hapus order?"}
          </DialogTitle>
          <DialogDescription>
            {deleteTarget
              ? `${deleteTarget.name} · ${PACKAGE_LABELS[deleteTarget.package] ?? deleteTarget.package}${
                  deleteTarget.licenseKey ? ` · Key ${deleteTarget.licenseKey}` : ""
                }`
              : null}
          </DialogDescription>
        </DialogHeader>
        {deleteTarget?.status === "approved" ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Order ini sudah approved dan key sudah dikirim ke pembeli. Pilih tindakan:
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => confirmDelete(false)}>
                Hapus order saja (key tetap aktif)
              </Button>
              <Button variant="destructive" onClick={() => confirmDelete(true)}>
                Hapus order + cabut key (pembeli kehilangan akses)
              </Button>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={() => confirmDelete(false)}>
              Hapus
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Approving a buyer who has not confirmed their e-mail. A stop, not a
        lock: the address may be perfectly real and the mail simply never
        opened, and refusing to serve someone who has already paid is the worse
        failure. */}
    <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o) setApproveTarget(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email belum dikonfirmasi</DialogTitle>
          <DialogDescription>
            {approveTarget
              ? `${approveTarget.name} · ${approveTarget.email ?? "tanpa email"}`
              : null}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Pembeli ini belum mengklik tautan konfirmasi yang kami kirim, jadi alamat
          emailnya belum terbukti benar. Kalau kamu yakin orangnya asli dan sudah
          membayar, tetap boleh disetujui.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setApproveTarget(null)}>
            Batal
          </Button>
          <Button
            onClick={() => {
              const target = approveTarget;
              setApproveTarget(null);
              // The server refuses an unconfirmed address unless this is sent,
              // and it stamps the purchase so the exception stays answerable.
              if (target) void handleApprove(target, true);
            }}
          >
            Ya, tetap setujui
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
