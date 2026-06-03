"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Wallet } from "lucide-react";
import type { PurchaseRequest } from "@/types";
import { formatIDR } from "@/lib/payments";

const PACKAGE_LABELS: Record<string, string> = {
  share: "Share",
  normal: "Normal",
  vip: "VIP",
  diamond: "Diamond",
  discount: "Diskon (legacy)",
  free: "Free",
};

const LOGIN_LABELS: Record<string, string> = {
  key: "License Key",
  email: "Google (Email)",
};

function tally(items: (string | undefined | null)[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const raw of items) {
    const key = (raw ?? "").toString().trim() || "—";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function Breakdown({
  title,
  entries,
  total,
  remap,
}: {
  title: string;
  entries: { label: string; count: number }[];
  total: number;
  remap?: Record<string, string>;
}) {
  if (total === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-1.5">
        {entries.map((e) => {
          const pct = total > 0 ? Math.round((e.count / total) * 100) : 0;
          const label = remap?.[e.label] ?? e.label;
          return (
            <div key={e.label} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-xs text-foreground" title={label}>
                {label}
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded bg-primary/70"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {e.count} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PurchaseSummary({ purchases }: { purchases: PurchaseRequest[] }) {
  const stats = useMemo(() => {
    const total = purchases.length;
    const approved = purchases.filter((p) => p.status === "approved");
    const revenue = approved.reduce(
      (sum, p) => sum + (typeof p.meta?.uniqueAmount === "number" ? p.meta.uniqueAmount : 0),
      0
    );
    return {
      total,
      approvedCount: approved.length,
      pendingCount: purchases.filter((p) => p.status === "pending").length,
      rejectedCount: purchases.filter((p) => p.status === "rejected").length,
      revenue,
      byStatus: tally(purchases.map((p) => p.status)),
      byPackage: tally(purchases.map((p) => p.package)),
      byClass: tally(purchases.map((p) => p.meta?.classCode)),
      byCampus: tally(purchases.map((p) => p.meta?.campus)),
      byDevice: tally(purchases.map((p) => p.meta?.deviceLimit ? `${p.meta.deviceLimit} device` : undefined)),
      byMethod: tally(purchases.map((p) => p.meta?.paymentMethod?.toUpperCase())),
      bySource: tally(purchases.map((p) => p.meta?.source)),
      byLogin: tally(purchases.map((p) => p.meta?.loginMethod)),
    };
  }, [purchases]);

  if (stats.total === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Belum ada data untuk diringkas di scope ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Ringkasan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Top stats */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Total" value={String(stats.total)} />
          <Stat label="Approved" value={String(stats.approvedCount)} accent="text-green-600" />
          <Stat label="Pending" value={String(stats.pendingCount)} accent="text-yellow-600" />
          <Stat label="Ditolak" value={String(stats.rejectedCount)} accent="text-red-600" />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-3">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Pendapatan (approved)</span>
          <span className="ml-auto text-base font-bold text-foreground">{formatIDR(stats.revenue)}</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Breakdown title="Status" entries={stats.byStatus} total={stats.total} />
          <Breakdown title="Paket" entries={stats.byPackage} total={stats.total} remap={PACKAGE_LABELS} />
          <Breakdown title="Metode login" entries={stats.byLogin} total={stats.total} remap={LOGIN_LABELS} />
          <Breakdown title="Jumlah device" entries={stats.byDevice} total={stats.total} />
          <Breakdown title="Metode bayar" entries={stats.byMethod} total={stats.total} />
          <Breakdown title="Sumber" entries={stats.bySource} total={stats.total} />
          <Breakdown title="Kelas" entries={stats.byClass} total={stats.total} />
          <Breakdown title="Kampus" entries={stats.byCampus} total={stats.total} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
      <p className={`text-xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
