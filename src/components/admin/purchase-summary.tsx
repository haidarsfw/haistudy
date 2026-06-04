"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Wallet, Search } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
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

const STATUS_LABELS: Record<string, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Ditolak",
};

// Distinct palette for the multi-slice / multi-bar charts.
const CHART_COLORS = [
  "#16a34a",
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
  "#64748b",
  "#eab308",
  "#3b82f6",
];
const STATUS_HEX: Record<string, string> = {
  approved: "#16a34a",
  pending: "#eab308",
  rejected: "#ef4444",
};
const BAR_COLOR = "#16a34a";

interface TallyEntry {
  label: string;
  count: number;
}

function tally(items: (string | undefined | null)[]): TallyEntry[] {
  const map = new Map<string, number>();
  for (const raw of items) {
    const key = (raw ?? "").toString().trim() || "—";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
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
      byDevice: tally(purchases.map((p) => (p.meta?.deviceLimit ? `${p.meta.deviceLimit} device` : undefined))),
      byMethod: tally(purchases.map((p) => p.meta?.paymentMethod?.toUpperCase())),
      bySource: tally(purchases.map((p) => p.meta?.source)),
      byLogin: tally(purchases.map((p) => p.meta?.loginMethod)),
    };
  }, [purchases]);

  // ─── Responses table: search + sort ───
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "amount" | "name">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    let list = purchases;
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((p) =>
        [
          p.name,
          p.whatsapp,
          p.email,
          p.meta?.loginEmail,
          p.licenseKey,
          p.meta?.classCode,
          p.meta?.campus,
          p.meta?.source,
          p.package,
          p.status,
          new Date(p.createdAt).toLocaleString("id-ID"),
          typeof p.meta?.uniqueAmount === "number" ? String(p.meta.uniqueAmount) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "amount") cmp = (a.meta?.uniqueAmount ?? 0) - (b.meta?.uniqueAmount ?? 0);
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [purchases, q, sortKey, sortDir]);

  const toggleSort = (key: "date" | "amount" | "name") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };
  const arrow = (key: "date" | "amount" | "name") => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  if (stats.total === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Belum ada data untuk diringkas di scope ini.
        </CardContent>
      </Card>
    );
  }

  const statusData = stats.byStatus.map((e) => ({
    name: STATUS_LABELS[e.label] ?? e.label,
    value: e.count,
    _key: e.label,
  }));
  const packageData = stats.byPackage.map((e) => ({
    name: PACKAGE_LABELS[e.label] ?? e.label,
    value: e.count,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Ringkasan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Total" value={String(stats.total)} />
            <Stat label="Approved" value={String(stats.approvedCount)} accent="text-green-600" tint="bg-green-500/5 border-green-500/20" />
            <Stat label="Pending" value={String(stats.pendingCount)} accent="text-yellow-600" tint="bg-yellow-500/5 border-yellow-500/20" />
            <Stat label="Ditolak" value={String(stats.rejectedCount)} accent="text-red-600" tint="bg-red-500/5 border-red-500/20" />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-3">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Pendapatan (approved)</span>
            <span className="ml-auto text-base font-bold text-foreground">{formatIDR(stats.revenue)}</span>
          </div>

          {/* Pies */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PieBlock title="Status" data={statusData} colorFor={(d, i) => STATUS_HEX[d._key as string] ?? CHART_COLORS[i % CHART_COLORS.length]} />
            <PieBlock title="Paket" data={packageData} colorFor={(_, i) => CHART_COLORS[i % CHART_COLORS.length]} />
          </div>

          {/* Horizontal bars */}
          <div className="grid gap-5 sm:grid-cols-2">
            <BarBlock title="Kelas" entries={stats.byClass} />
            <BarBlock title="Kampus" entries={stats.byCampus} />
            <BarBlock title="Sumber" entries={stats.bySource} />
            <BarBlock title="Jumlah device" entries={stats.byDevice} />
            <BarBlock title="Metode login" entries={stats.byLogin} remap={LOGIN_LABELS} />
            <BarBlock title="Metode bayar" entries={stats.byMethod} />
          </div>
        </CardContent>
      </Card>

      {/* Responses table (Google-Forms style: one row per response, all fields) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Responses ({rows.length})</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari respons…"
                className="h-8 w-56 max-w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none transition-colors focus:border-primary/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Th onClick={() => toggleSort("date")} className="cursor-pointer select-none">Tanggal{arrow("date")}</Th>
                  <Th onClick={() => toggleSort("name")} className="cursor-pointer select-none">Nama{arrow("name")}</Th>
                  <Th>WhatsApp</Th>
                  <Th>Email</Th>
                  <Th>Login</Th>
                  <Th>Paket</Th>
                  <Th onClick={() => toggleSort("amount")} className="cursor-pointer select-none text-right">Nominal{arrow("amount")}</Th>
                  <Th>Kelas</Th>
                  <Th>Kampus</Th>
                  <Th>Device</Th>
                  <Th>Bayar</Th>
                  <Th>Sumber</Th>
                  <Th>Periode</Th>
                  <Th>Status</Th>
                  <Th>Key</Th>
                  <Th>Bukti</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 align-top hover:bg-muted/30">
                    <Td className="whitespace-nowrap">{new Date(p.createdAt).toLocaleString("id-ID")}</Td>
                    <Td className="font-medium text-foreground">{p.name}</Td>
                    <Td className="whitespace-nowrap">{p.whatsapp}</Td>
                    <Td>{p.email || "—"}</Td>
                    <Td>{p.meta?.loginMethod === "email" ? "Google" : "Key"}</Td>
                    <Td>{PACKAGE_LABELS[p.package] ?? p.package}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">
                      {typeof p.meta?.uniqueAmount === "number" ? `Rp ${p.meta.uniqueAmount.toLocaleString("id-ID")}` : "—"}
                    </Td>
                    <Td>{p.meta?.classCode || "—"}</Td>
                    <Td>{p.meta?.campus || "—"}</Td>
                    <Td>{p.meta?.deviceLimit ?? "—"}</Td>
                    <Td>{p.meta?.paymentMethod?.toUpperCase() || "—"}</Td>
                    <Td>{p.meta?.source || "—"}</Td>
                    <Td className="whitespace-nowrap font-mono">s{p.semester}-{p.examPeriod}-{p.jurusan}</Td>
                    <Td>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ color: STATUS_HEX[p.status], backgroundColor: `${STATUS_HEX[p.status]}1a` }}
                      >
                        {p.status}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap font-mono">{p.licenseKey || "—"}</Td>
                    <Td className="whitespace-nowrap">
                      <span className="flex gap-1.5">
                        {p.paymentProofUrl && <ProofLink href={p.paymentProofUrl} label="Bayar" />}
                        {p.shareProofUrl && <ProofLink href={p.shareProofUrl} label="Share" />}
                        {p.shareProofUrl2 && <ProofLink href={p.shareProofUrl2} label="Share2" />}
                        {!p.paymentProofUrl && !p.shareProofUrl && !p.shareProofUrl2 && "—"}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent, tint }: { label: string; value: string; accent?: string; tint?: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 text-center ${tint ?? "border-border bg-card"}`}>
      <p className={`text-2xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function PieBlock({
  title,
  data,
  colorFor,
}: {
  title: string;
  data: { name: string; value: number; _key?: string }[];
  colorFor: (d: { name: string; value: number; _key?: string }, i: number) => string;
}) {
  if (!data.length) return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label labelLine={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={colorFor(d, i)} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function BarBlock({
  title,
  entries,
  remap,
}: {
  title: string;
  entries: TallyEntry[];
  remap?: Record<string, string>;
}) {
  if (!entries.length) return null;
  const data = entries.map((e) => ({ name: remap?.[e.label] ?? e.label, value: e.count }));
  const height = Math.max(120, data.length * 32 + 24);
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 24, top: 2, bottom: 2 }}>
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={BAR_COLOR} label={{ position: "right", fontSize: 11 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Th({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <th onClick={onClick} className={`px-2 py-2 font-semibold ${className ?? ""}`}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1.5 text-muted-foreground ${className ?? ""}`}>{children}</td>;
}

function ProofLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20"
    >
      {label}
    </a>
  );
}
