"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "@/components/ui/icons";

import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface Ranking {
  top: { rank: number; name: string; overall: number; isYou: boolean; hidden: boolean }[];
  me: { rank: number; overall: number; hidden: boolean } | null;
  total: number;
  role: "mentor" | "member";
}

/**
 * The group ranking: the top 10 and where you stand, by the same overall
 * progress the dashboard shows. Anyone can keep their name out of it.
 */
export function GroupRanking({ groupId, archived }: { groupId: string; archived: boolean }) {
  const [data, setData] = useState<Ranking | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/mentor/groups/${groupId}/ranking`, { credentials: "same-origin" });
    if (r.ok) setData((await r.json()) as Ranking);
    else setFailed(true);
  }, [groupId]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/mentor/groups/${groupId}/ranking`, { credentials: "same-origin" })
      .then(async (r) => {
        if (!alive) return;
        if (r.ok) setData((await r.json()) as Ranking);
        else setFailed(true);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [groupId]);

  if (failed) return <p className="text-sm text-destructive">Peringkat belum bisa dimuat.</p>;
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Menghitung peringkat
      </p>
    );
  }
  if (data.total === 0) return <p className="text-sm text-muted-foreground">Belum ada anggota di grup ini.</p>;

  const toggle = async (hidden: boolean) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/mentor/groups/${groupId}/ranking`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hidden }),
      });
      const b = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) toast.error(b.error ?? "Belum tersimpan.");
      await load();
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <ol className="divide-y divide-border rounded-lg border border-border">
        {data.top.map((p) => (
          <li
            key={p.rank}
            className={cn("flex items-center gap-3 px-3 py-2 text-sm", p.isYou && "bg-primary/10")}
          >
            <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">{p.rank}.</span>
            <span className="min-w-0 flex-1 truncate text-foreground">
              {p.name}
              {p.isYou && " (kamu)"}
              {data.role === "mentor" && p.hidden && (
                <span className="text-xs text-muted-foreground"> · tampil sebagai “Anggota”</span>
              )}
            </span>
            <span className="shrink-0 tabular-nums font-medium text-foreground">{p.overall}%</span>
          </li>
        ))}
      </ol>

      {data.me && (
        <p className="text-sm text-foreground">
          Posisimu: <span className="font-semibold">#{data.me.rank}</span> dari {data.total} ·{" "}
          <span className="tabular-nums">{data.me.overall}%</span>
        </p>
      )}

      {data.role === "member" && data.me && !archived && (
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={data.me.hidden}
            disabled={busy}
            onChange={(e) => void toggle(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Sembunyikan namaku di peringkat
        </label>
      )}

      <p className="text-xs text-muted-foreground">
        Diurutkan dari progres keseluruhan, angka yang sama dengan di dashboard. Kalau sama, yang lebih sering
        mengerjakan Latihan Soal di atas.
      </p>
    </div>
  );
}
