"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Banknote, Loader2, Pause, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/payments";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Partner, sisi pemilik.
 *
 * Disusun dari keputusan yang benar-benar diambil di sini, dan cuma ada dua:
 * "siapa yang menunggu dijawab" dan "siapa yang harus saya transfer". Jadi yang
 * menunggu ada di paling atas, dan yang aktif dibaca lewat satu kolom: berapa
 * yang belum dibayar. Bukan tabel Nama / Status / Tanggal / Aksi.
 */

interface Partner {
  id: string;
  status: "pending" | "active" | "paused" | "rejected";
  pitch: string | null;
  adminNote: string | null;
  appliedAt: string;
  decidedAt: string | null;
  account: { name: string; email: string; whatsapp: string | null } | null;
  payout: {
    method: string | null;
    bank: string | null;
    number: string | null;
    name: string | null;
  };
  summary: {
    sales: number;
    currentPercent: number;
    next: { percent: number; after: number } | null;
    earned: number;
    unpaid: number;
  };
}

function tanggal(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PartnerList() {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);
  // Which partner is one tap away from being marked paid. Marking is the only
  // action on this screen with no undo in the panel, and it moves every unpaid
  // row at once, so it asks first and says exactly how much and to whom.
  const [konfirmasi, setKonfirmasi] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/partners", { credentials: "same-origin" });
      if (!res.ok) {
        setError("Daftar partner tidak bisa dimuat.");
        return;
      }
      const body = (await res.json()) as { partners: Partner[] };
      setPartners(body.partners);
    } catch {
      setError("Koneksi terputus saat memuat daftar partner.");
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const ubah = async (id: string, patch: Record<string, unknown>, pesan: string) => {
    setSibuk(id);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        markedPaid?: number;
        total?: number;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Gagal.");
        return;
      }
      if (typeof body.markedPaid === "number") {
        toast.success(
          body.markedPaid === 0
            ? "Tidak ada komisi yang menunggu dibayar."
            : `${body.markedPaid} komisi ditandai dibayar, total ${formatIDR(body.total ?? 0)}.`
        );
      } else {
        toast.success(pesan);
      }
      await muat();
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setSibuk(null);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-8 text-center">
        <AlertCircle className="mx-auto h-5 w-5 text-destructive" />
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void muat()}>
          Coba muat ulang
        </Button>
      </div>
    );
  }

  if (!partners) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat daftar partner
      </div>
    );
  }

  const menunggu = partners.filter((p) => p.status === "pending");
  const aktif = partners.filter((p) => p.status === "active");
  const lainnya = partners.filter((p) => p.status === "paused" || p.status === "rejected");
  const totalUtang = aktif.reduce((n, p) => n + p.summary.unpaid, 0);

  if (partners.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
        <p className="text-sm font-medium text-foreground">Belum ada yang mengajukan</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pengajuan masuk dari halaman /partner. Arahkan calon mentor ke sana.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {totalUtang > 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Belum ditransfer ke siapa pun
          </p>
          <p className="mt-0.5 font-display text-2xl font-bold text-foreground">
            {formatIDR(totalUtang)}
          </p>
        </div>
      )}

      {menunggu.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground">
            Menunggu dijawab ({menunggu.length})
          </h3>
          <div className="mt-2 space-y-2">
            {menunggu.map((p) => (
              <article key={p.id} className="rounded-xl border border-primary/30 bg-card p-4">
                <Identitas p={p} />
                {p.pitch && (
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                    {p.pitch}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={sibuk === p.id}
                    onClick={() => ubah(p.id, { status: "active" }, "Disetujui.")}
                  >
                    Setujui jadi partner
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sibuk === p.id}
                    onClick={() => ubah(p.id, { status: "rejected" }, "Ditolak.")}
                    className="gap-1.5"
                  >
                    <X className="h-3.5 w-3.5" />
                    Tolak
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {aktif.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground">Aktif ({aktif.length})</h3>
          <div className="mt-2 space-y-2">
            {aktif.map((p) => (
              <article key={p.id} className="rounded-xl border border-border bg-card p-4">
                <Identitas p={p} />

                <dl className="mt-2.5 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                  <Baris
                    label="Belum dibayar"
                    value={formatIDR(p.summary.unpaid)}
                    tekan={p.summary.unpaid > 0}
                  />
                  <Baris label="Total sepanjang kemitraan" value={formatIDR(p.summary.earned)} />
                  <Baris
                    label="Orang yang dibawa"
                    value={`${p.summary.sales}, berikutnya ${p.summary.currentPercent}%`}
                  />
                  <Baris label="Dikirim ke" value={tujuan(p)} />
                </dl>

                <div className="mt-3 flex flex-wrap gap-2">
                  {/* Tidak dirender sama sekali kalau tidak ada yang harus
                      dibayar. Tombol yang hanya diredupkan tetap terlihat bisa
                      ditekan, dan menekannya tidak menjelaskan apa-apa. */}
                  {p.summary.unpaid > 0 && (
                    <TombolBayar
                      p={p}
                      sibuk={sibuk}
                      konfirmasi={konfirmasi}
                      setKonfirmasi={setKonfirmasi}
                      onBayar={() => ubah(p.id, { markPaid: true }, "Ditandai dibayar.")}
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sibuk === p.id}
                    onClick={() => ubah(p.id, { status: "paused" }, "Dijeda.")}
                    className="gap-1.5"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Jeda
                  </Button>
                </div>
                {p.summary.unpaid === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.summary.sales > 0
                      ? "Semua komisinya sudah ditandai dibayar."
                      : "Belum ada orang yang membeli lewat kodenya, jadi belum ada yang perlu ditransfer."}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {lainnya.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground">
            Dijeda dan ditolak ({lainnya.length})
          </h3>
          <div className="mt-2 space-y-2">
            {lainnya.map((p) => (
              <article key={p.id} className="rounded-xl border border-border bg-card/50 p-4">
                <Identitas p={p} />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {p.status === "paused" ? "Dijeda" : "Ditolak"}
                  {p.decidedAt ? ` ${tanggal(p.decidedAt)}` : ""}
                  {p.summary.unpaid > 0
                    ? `. Masih ada ${formatIDR(p.summary.unpaid)} yang belum ditransfer.`
                    : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sibuk === p.id}
                    onClick={() => ubah(p.id, { status: "active" }, "Diaktifkan.")}
                    className="gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Aktifkan
                  </Button>
                  {p.summary.unpaid > 0 && (
                    <TombolBayar
                      p={p}
                      sibuk={sibuk}
                      konfirmasi={konfirmasi}
                      setKonfirmasi={setKonfirmasi}
                      onBayar={() => ubah(p.id, { markPaid: true }, "Ditandai dibayar.")}
                      variant="outline"
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


function TombolBayar({
  p,
  sibuk,
  konfirmasi,
  setKonfirmasi,
  onBayar,
  variant = "default",
}: {
  p: Partner;
  sibuk: string | null;
  konfirmasi: string | null;
  setKonfirmasi: (id: string | null) => void;
  onBayar: () => void;
  variant?: "default" | "outline";
}) {
  if (konfirmasi !== p.id) {
    return (
      <Button
        size="sm"
        variant={variant}
        disabled={sibuk === p.id}
        onClick={() => setKonfirmasi(p.id)}
        className="gap-1.5"
      >
        <Banknote className="h-3.5 w-3.5" />
        Tandai sudah ditransfer
      </Button>
    );
  }
  return (
    <div
      role="group"
      aria-label="Konfirmasi pembayaran"
      className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
    >
      <p className="min-w-0 flex-1 text-xs text-foreground">
        Tandai {formatIDR(p.summary.unpaid)} sudah ditransfer ke{" "}
        <span className="font-semibold">{p.account?.name || p.account?.email || "partner ini"}</span>?
        Tidak bisa dibatalkan dari panel.
      </p>
      <Button size="sm" variant="ghost" onClick={() => setKonfirmasi(null)}>
        Batal
      </Button>
      <Button
        size="sm"
        disabled={sibuk === p.id}
        onClick={() => {
          setKonfirmasi(null);
          onBayar();
        }}
      >
        Ya, sudah ditransfer
      </Button>
    </div>
  );
}

function tujuan(p: Partner): string {
  if (!p.payout.number) return "Belum diisi partner";
  return `${p.payout.bank ?? ""} ${p.payout.number} a.n. ${p.payout.name ?? ""}`.trim();
}

function Identitas({ p }: { p: Partner }) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <div className="min-w-0">
        {/* Yang belum mengisi nama panggilan tampil dengan emailnya sebagai
            judul, dan barisnya TIDAK diulang di bawah. Email yang sama dua kali
            terbaca seperti data rusak. */}
        <p className="truncate text-sm font-semibold text-foreground">
          {p.account?.name || p.account?.email || "Akun terhapus"}
        </p>
        {(p.account?.name || p.account?.whatsapp) && (
          <p className="truncate text-xs text-muted-foreground">
            {[p.account?.name ? p.account.email : null, p.account?.whatsapp]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Mengajukan {tanggal(p.appliedAt)}</p>
    </header>
  );
}

function Baris({
  label,
  value,
  tekan,
}: {
  label: string;
  value: string;
  tekan?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-sm",
          tekan ? "font-semibold text-primary" : "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
