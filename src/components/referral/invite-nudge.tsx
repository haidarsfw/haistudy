"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Users } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  INTERRUPTION_PRIORITY,
  useInterruptionSlot,
} from "@/components/providers/interruption-provider";
import { toast } from "@/components/ui/toast";

interface Kelayakan {
  eligible: boolean;
  code?: string;
  credited?: number;
  target?: number;
  toFree?: number;
}

/**
 * "Ajak 5 teman, periode berikutnya gratis."
 *
 * Muncul sesekali untuk yang sudah membeli, lewat antrean gangguan yang sama
 * dengan semua yang lain: paling banyak satu per masuk. Jaraknya 14 hari dan
 * dihitung di server, pada akun, supaya ganti HP tidak mengembalikannya.
 *
 * Progresnya ditampilkan apa adanya, termasuk saat masih nol. Angka yang
 * sebenarnya lebih berguna daripada ajakan tanpa konteks, dan orang yang sudah
 * mengajak dua teman lebih mungkin mengajak yang ketiga kalau dia melihat
 * dirinya sudah di tengah jalan.
 */
export function InviteNudge() {
  const [data, setData] = useState<Kelayakan | null>(null);
  // Sudah dijawab, bukan "sedang terbuka". Terbuka atau tidak bisa diturunkan
  // dari kelayakan, giliran antrean, dan apakah orangnya sudah menjawab, jadi
  // menyimpannya lagi hanya menambah satu keadaan yang bisa tidak sinkron.
  const [dijawab, setDijawab] = useState(false);
  const [tersalin, setTersalin] = useState(false);

  const { granted, release } = useInterruptionSlot("invite-nudge", {
    lane: "modal",
    priority: INTERRUPTION_PRIORITY.inviteNudge,
    ready: Boolean(data?.eligible),
  });

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const res = await fetch("/api/account/invite-nudge", { credentials: "same-origin" });
        if (!res.ok || batal) return;
        setData((await res.json()) as Kelayakan);
      } catch {
        // Tidak ada yang perlu dikatakan: ini ajakan, bukan fitur yang dicari
        // orang. Gagal memuatnya berarti ia tidak muncul, dan itu sudah benar.
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

  const jawab = async (forever: boolean) => {
    setDijawab(true);
    release();
    try {
      await fetch("/api/account/invite-nudge", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ forever }),
      });
    } catch {
      // Jawabannya tidak tersimpan, jadi ia akan muncul lagi nanti. Itu
      // kekurangan yang bisa diterima; menahan modal yang sudah ditutup di
      // layar sampai jaringan pulih tidak.
    }
  };

  const open = granted && Boolean(data?.eligible) && !dijawab;
  if (!data?.eligible || !data.code) return null;

  const tautan =
    typeof window === "undefined" ? "" : `${window.location.origin}/@${data.code}`;
  const terlihat = tautan.replace(/^https?:\/\//, "");

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(tautan);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      toast.error("Browser menolak menyalin. Salin manual dari kolom di atas.");
    }
  };

  const sudah = data.credited ?? 0;
  const target = data.target ?? 5;
  const kurang = data.toFree ?? target;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) void jawab(false); }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </span>
            {sudah === 0
              ? `Ajak ${target} teman, periode berikutnya gratis`
              : `Kurang ${kurang} teman lagi`}
          </DialogTitle>
          <DialogDescription className="text-left">
            {sudah === 0
              ? `Tiap teman yang beli pakai kodemu menambah saldo Rp5.000 ke akunmu. ${target} teman cukup untuk satu periode Share.`
              : `Kamu sudah mengajak ${sudah} dari ${target}. Temanmu juga dapat potongan Rp5.000 di pembelian pertamanya.`}
          </DialogDescription>
        </DialogHeader>

        {/* Progres nyata, bukan hiasan: tiap petak satu teman yang pembeliannya
            sudah disetujui. */}
        <div
          className="flex gap-1.5"
          role="img"
          aria-label={`${sudah} dari ${target} teman sudah bergabung`}
        >
          {Array.from({ length: target }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < sudah ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm text-foreground">
            {terlihat}
          </code>
          {/* Tindakan utamanya menyalin, bukan menutup. Tombol hijau besar di
              sebelah "Nanti saja" akan memberi tahu orang bahwa yang paling
              disarankan adalah pergi. */}
          <Button onClick={salin} className="h-11 shrink-0 gap-2">
            {tersalin ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {tersalin ? "Tersalin" : "Salin link"}
          </Button>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" className="h-11" onClick={() => void jawab(true)}>
            Jangan tampilkan lagi
          </Button>
          <Button variant="outline" className="h-11" onClick={() => void jawab(false)}>
            Nanti saja
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
