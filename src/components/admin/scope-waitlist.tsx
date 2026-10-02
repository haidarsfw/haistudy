"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { parseScopeKey, scopeFullLabel } from "@/lib/scope";

interface Waiting {
  id: string;
  scopeKey: string;
  package: string | null;
  createdAt: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
}

/**
 * Daftar tunggu "Kabari saya".
 *
 * Ada untuk satu tugas: saat sebuah periode dibuka, kabari orang-orang yang
 * pernah menekan tombolnya. Jadi dikelompokkan per periode, tiap orang punya
 * tautan WhatsApp yang langsung terbuka, dan begitu sudah dikabari, ia hilang
 * dari daftar supaya tidak ada yang dikabari dua kali.
 */
export function ScopeWaitlist() {
  const [rows, setRows] = useState<Waiting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/scope-interest", { credentials: "same-origin" });
      if (!res.ok) {
        setError("Daftar tunggu tidak bisa dimuat.");
        return;
      }
      setRows(((await res.json()) as { waiting: Waiting[] }).waiting);
    } catch {
      setError("Koneksi terputus saat memuat daftar tunggu.");
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const tandai = async (payload: { id?: string; scopeKey?: string }) => {
    try {
      const res = await fetch("/api/admin/scope-interest", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error("Gagal menandai.");
        return;
      }
      await muat();
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 text-destructive" />
        {error}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => void muat()}>
          Muat ulang
        </Button>
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat daftar tunggu
      </div>
    );
  }

  // Kosong itu keadaan normal, dan dikatakan sekali tanpa kotak besar: halaman
  // ini dibuka untuk pesanan, bukan untuk daftar ini.
  if (rows.length === 0) {
    return (
      <p className="px-1 text-xs text-muted-foreground">
        Daftar tunggu periode yang belum dibuka: kosong.
      </p>
    );
  }

  const perPeriode = new Map<string, Waiting[]>();
  for (const r of rows) perPeriode.set(r.scopeKey, [...(perPeriode.get(r.scopeKey) ?? []), r]);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">Menunggu periodenya dibuka</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Mereka menekan &ldquo;Kabari saya&rdquo; di checkout. Saat periodenya dijual, kabari lalu tandai.
      </p>
      <div className="mt-3 space-y-4">
        {[...perPeriode.entries()].map(([sk, list]) => {
          const scope = parseScopeKey(sk);
          return (
            <div key={sk}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {scope ? scopeFullLabel(scope) : sk}{" "}
                  <span className="text-muted-foreground">({list.length})</span>
                </p>
                <Button size="sm" variant="outline" onClick={() => void tandai({ scopeKey: sk })}>
                  Tandai semua sudah dikabari
                </Button>
              </div>
              <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border">
                {list.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {w.name || w.email || "Akun terhapus"}
                      {w.package && (
                        <span className="text-muted-foreground"> · melihat paket {w.package}</span>
                      )}
                    </span>
                    {w.whatsapp && (
                      <a
                        href={`https://wa.me/${w.whatsapp.replace(/\D/g, "").replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void tandai({ id: w.id })}
                      className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Sudah dikabari
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
