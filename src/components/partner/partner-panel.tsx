"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/payments";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { MentorGroups } from "@/components/mentor/mentor-groups";

/**
 * Halaman partner.
 *
 * Isinya berbeda-beda tergantung status, dan itu bukan satu template dengan
 * bagian yang disembunyikan: orang yang belum mengajukan datang untuk membaca
 * tawarannya, yang menunggu datang untuk tahu kapan dijawab, dan yang sudah
 * aktif datang untuk satu angka: berapa yang belum dibayar. Tiga pertanyaan
 * berbeda, tiga halaman berbeda.
 *
 * Ikon dari set yang sama dengan seluruh aplikasi (lucide): konsistensi di
 * dalam satu produk lebih berarti daripada menghindari pustaka yang populer,
 * dan tiap ikon di sini menandai hal yang nyata, bukan hiasan.
 */

interface Band {
  from: number;
  to: number | null;
  percent: number;
}

interface Commission {
  nth: number;
  ratePercent: number;
  baseAmount: number;
  amount: number;
  paidAt: string | null;
  createdAt: string;
}

interface Leaderboard {
  top: { rank: number; name: string; people: number; isYou: boolean }[];
  you: { rank: number; people: number } | null;
}

interface PartnerData {
  status: "none" | "pending" | "active" | "paused" | "rejected";
  appliedAt?: string;
  payout?: {
    method: string | null;
    bank: string | null;
    number: string | null;
    name: string | null;
  };
  summary?: {
    sales: number;
    currentPercent: number;
    next: { percent: number; after: number } | null;
    earned: number;
    unpaid: number;
  };
  ladder: Band[];
  codes?: string[];
  commissions?: Commission[];
  leaderboard?: Leaderboard | null;
}

function tanggal(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PartnerPanel() {
  const [data, setData] = useState<PartnerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/partner/me", { credentials: "same-origin" });
      if (!res.ok) {
        setError("Data kemitraan tidak bisa dimuat.");
        return;
      }
      setData((await res.json()) as PartnerData);
    } catch {
      setError("Koneksi terputus saat memuat data kemitraan.");
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  if (error) {
    return (
      <Keadaan ikon={<AlertCircle className="h-5 w-5 text-destructive" />} judul="Gagal memuat">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" className="mt-4" onClick={() => void muat()}>
          Coba muat ulang
        </Button>
      </Keadaan>
    );
  }

  if (!data) {
    return (
      <Keadaan
        ikon={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        judul="Memuat data kemitraan"
      >
        <p className="text-sm text-muted-foreground">Sebentar ya.</p>
      </Keadaan>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <header>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground lg:text-2xl">
          Partner haistudy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajak teman pakai kodemu, dapat bagian dari pembelian pertama tiap orang yang kamu ajak.
        </p>
      </header>

      {/* Mentors only; renders nothing for anyone without a group. */}
      <MentorGroups />

      {(data.status === "active" || data.status === "paused") && (
        <PartnerAktif data={data} onTersimpan={() => void muat()} />
      )}
      {data.status === "pending" && <Menunggu appliedAt={data.appliedAt} />}
      {data.status === "rejected" && <Ditolak onKirim={() => void muat()} />}
      {data.status === "none" && <Tawaran ladder={data.ladder} onKirim={() => void muat()} />}
    </div>
  );
}

/** Rangka bersama untuk memuat, gagal, dan kosong. */
function Keadaan({
  ikon,
  judul,
  children,
}: {
  ikon: React.ReactNode;
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8 rounded-xl border border-border bg-card px-5 py-8 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        {ikon}
      </div>
      <h2 className="font-display text-base font-semibold text-foreground">{judul}</h2>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ─── Sudah jadi partner ───

function PartnerAktif({
  data,
  onTersimpan,
}: {
  data: PartnerData;
  onTersimpan: () => void;
}) {
  const s = data.summary!;
  const kode = data.codes?.[0] ?? null;

  return (
    <div className="space-y-8">
      {data.status === "paused" && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-sm text-foreground">
          Kemitraanmu sedang dijeda. Komisi yang sudah tercatat tetap dibayar, tapi
          orang baru yang membeli belum dihitung sampai diaktifkan lagi.
        </p>
      )}

      {/* Satu angka yang jadi alasan halaman ini dibuka. Sisanya menyusul di
          bawahnya sebagai kalimat, bukan sebagai kartu seukuran yang sama.
          Empat kartu sejajar membuat yang penting dan yang sekadar informasi
          terlihat sama berat. */}
      <section>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Belum dibayar
        </p>
        <p className="mt-1 font-display text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
          {formatIDR(s.unpaid)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Total sepanjang kemitraan {formatIDR(s.earned)}, dari{" "}
          {s.sales === 0 ? "belum ada yang membeli" : `${s.sales} orang yang membeli`}.
        </p>
      </section>

      <Tangga ladder={data.ladder} sales={s.sales} currentPercent={s.currentPercent} next={s.next} />

      {kode && <LinkAjak kode={kode} />}

      {data.leaderboard && (
        <Peringkat board={data.leaderboard} paused={data.status === "paused"} />
      )}

      {s.sales === 0 ? (
        <section className="rounded-xl border border-dashed border-border px-5 py-6">
          <h2 className="font-display text-base font-semibold text-foreground">
            Belum ada yang beli lewat kodemu
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Komisi tercatat saat pembelian temanmu disetujui, bukan saat dia daftar.
            Bagikan link di atas untuk mulai.
          </p>
        </section>
      ) : (
        <Riwayat rows={data.commissions ?? []} />
      )}

      <Rekening payout={data.payout!} onTersimpan={onTersimpan} />
    </div>
  );
}

/**
 * Posisi di tangga.
 *
 * Yang ingin diketahui orang bukan "saya di pita mana", tapi "berapa orang lagi
 * sampai naik". Jadi kalimatnya yang jadi utama, dan pitanya di bawah sebagai
 * rujukan.
 */
function Tangga({
  ladder,
  sales,
  currentPercent,
  next,
}: {
  ladder: Band[];
  sales: number;
  currentPercent: number;
  next: { percent: number; after: number } | null;
}) {
  // Berapa pembelian lagi yang masih dihitung dengan tarif sekarang sebelum
  // pita berikutnya mulai. Pembelian ke-(sales+1) adalah yang berikutnya, dan
  // `next.after` adalah yang pertama memakai tarif baru.
  const kurang = next ? next.after - (sales + 1) : 0;

  return (
    <section>
      <h2 className="font-display text-base font-semibold text-foreground">
        Orang berikutnya yang membeli dihitung {currentPercent}%
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {next
          ? kurang === 1
            ? `Satu orang lagi dengan tarif ini, lalu naik ke ${next.percent}%.`
            : `${kurang} orang lagi dengan tarif ini, lalu naik ke ${next.percent}%.`
          : "Ini tarif tertinggi."}
      </p>

      <ul className="mt-4 space-y-1.5">
        {ladder.map((b) => {
          const aktif = b.percent === currentPercent;
          return (
            <li
              key={b.percent}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm",
                aktif
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground"
              )}
            >
              <span>
                Orang ke-{b.from}
                {b.to === null ? " ke atas" : ` sampai ke-${b.to}`}
              </span>
              <span className={cn("font-semibold", aktif && "text-primary")}>
                {b.percent}%
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Dihitung per orang, sekali saja: pembelian pertama tiap orang yang kamu ajak.
        Perpanjangan periode berikutnya tidak dihitung lagi. Orang ke-6 dihitung 30%,
        dan lima orang pertama tetap 25% selamanya.
      </p>
    </section>
  );
}

/**
 * Papan peringkat partner.
 *
 * Orang, bukan uang: partner lain hanya melihat nama panggilan dan jumlah
 * orangnya. Baris sendiri ditandai seperti pita tarif yang sedang berlaku di
 * atasnya, dan kalau posisimu di luar sepuluh besar, letaknya disebut di bawah
 * daftar supaya tidak perlu dicari.
 */
function Peringkat({ board, paused }: { board: Leaderboard; paused: boolean }) {
  const diLuarDaftar = board.you !== null && board.you.rank > board.top.length;

  return (
    <section>
      <h2 className="font-display text-base font-semibold text-foreground">Peringkat partner</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Urut dari jumlah orang yang membeli lewat kode masing-masing. Partner lain hanya
        melihat nama panggilan dan jumlah orangnya, bukan komisinya.
      </p>

      {board.top.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-3.5 py-3 text-sm text-muted-foreground">
          Belum ada partner yang punya pembeli. Yang pertama akan muncul di sini.
        </p>
      ) : (
        <ol className="mt-4 space-y-1.5">
          {board.top.map((r) => (
            <li
              key={r.rank}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm",
                r.isYou ? "border-primary/40 bg-primary/5" : "border-border"
              )}
            >
              <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-muted-foreground">
                {r.rank}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {r.name}
                {r.isYou && <span className="ml-1.5 text-xs font-normal text-primary">kamu</span>}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{r.people} orang</span>
            </li>
          ))}
        </ol>
      )}

      {diLuarDaftar && board.you && (
        <p className="mt-3 text-sm text-foreground">
          Kamu di peringkat {board.you.rank} dengan {board.you.people} orang.
        </p>
      )}
      {board.you === null && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {paused
            ? "Selama kemitraanmu dijeda, namamu tidak tampil di peringkat."
            : "Kamu belum masuk peringkat. Orang pertama yang membeli lewat kodemu memasukkanmu ke sini."}
        </p>
      )}
    </section>
  );
}

function LinkAjak({ kode }: { kode: string }) {
  const [tersalin, setTersalin] = useState(false);
  // Yang disalin adalah URL utuh; yang ditampilkan tanpa protokol. Di layar
  // HP "https://" memakan ruang yang membuat kodenya sendiri terpotong, dan
  // kode itu justru satu-satunya bagian yang perlu dibaca.
  const tautan = typeof window === "undefined" ? "" : `${window.location.origin}/@${kode}`;
  const terlihat = tautan.replace(/^https?:\/\//, "") || `haistudy.site/@${kode}`;

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(tautan);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      toast.error("Browser menolak menyalin. Salin manual dari kolom di samping.");
    }
  };

  return (
    <section>
      <h2 className="font-display text-base font-semibold text-foreground">Link ajakanmu</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Yang membuka link ini lalu mendaftar dalam 7 hari terhitung sebagai ajakanmu, dan itu berlaku selamanya.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* `break-all`, bukan `truncate`: kalau harus memilih antara dua baris
            dan kode yang tersembunyi di balik elipsis, dua baris menang, karena
            kodenya satu-satunya bagian yang perlu dibaca. */}
        <code className="min-w-0 flex-1 break-all rounded-lg border border-border bg-muted px-3.5 py-2.5 font-mono text-sm text-foreground">
          {terlihat}
        </code>
        <Button onClick={salin} variant="outline" className="h-11 shrink-0 gap-2">
          {tersalin ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          {tersalin ? "Tersalin" : "Salin link"}
        </Button>
      </div>
    </section>
  );
}

/**
 * Riwayat komisi.
 *
 * Kolomnya dipilih dari keputusan yang diambil orang saat membacanya: "yang
 * mana yang belum dibayar, dan berapa". Bukan Nama / Status / Tanggal / Aksi.
 */
function Riwayat({ rows }: { rows: Commission[] }) {
  return (
    <section>
      <h2 className="font-display text-base font-semibold text-foreground">Riwayat komisi</h2>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
        {rows.map((r) => (
          <li
            key={r.nth}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm text-foreground">
                Orang ke-{r.nth}
                <span className="text-muted-foreground">
                  {" "}
                  &middot; {r.ratePercent}% dari {formatIDR(r.baseAmount)}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {r.paidAt ? `Dibayar ${tanggal(r.paidAt)}` : `Tercatat ${tanggal(r.createdAt)}`}
              </p>
            </div>
            {/* `ml-auto` supaya saat barisnya terbungkus di layar sempit,
                nominalnya tetap rata kanan di bawah keterangannya, bukan
                menempel kiri seperti kalimat lanjutan. */}
            <div className="ml-auto text-right">
              <p className="font-display text-sm font-semibold text-foreground">
                {formatIDR(r.amount)}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  r.paidAt ? "text-muted-foreground" : "text-primary"
                )}
              >
                {r.paidAt ? "Sudah dibayar" : "Belum dibayar"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Rekening({
  payout,
  onTersimpan,
}: {
  payout: NonNullable<PartnerData["payout"]>;
  onTersimpan: () => void;
}) {
  const [method, setMethod] = useState(payout.method ?? "bank");
  const [bank, setBank] = useState(payout.bank ?? "");
  const [number, setNumber] = useState(payout.number ?? "");
  const [name, setName] = useState(payout.name ?? "");
  const [menyimpan, setMenyimpan] = useState(false);
  const [keluhan, setKeluhan] = useState<string | null>(null);

  const simpan = async () => {
    if (!bank.trim() || !number.trim() || !name.trim()) {
      setKeluhan("Ketiga kolomnya perlu diisi dulu.");
      return;
    }
    setKeluhan(null);
    setMenyimpan(true);
    try {
      const res = await fetch("/api/partner/apply", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, bank, number, name }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success("Tujuan pembayaran tersimpan.");
      onTersimpan();
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <section>
      <h2 className="font-display text-base font-semibold text-foreground">
        Ke mana komisinya dikirim
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {payout.number
          ? "Ganti kapan saja. Yang sudah dibayar tidak terpengaruh."
          : "Isi dulu supaya komisimu bisa dikirim."}
      </p>

      <div className="mt-3 space-y-3">
        <div className="flex gap-2">
          {(["bank", "ewallet"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              aria-pressed={method === m}
              className={cn(
                "h-11 flex-1 rounded-lg border px-4 text-sm font-medium transition-colors",
                method === m
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "bank" ? "Transfer bank" : "E-wallet"}
            </button>
          ))}
        </div>

        <Kolom
          id="pr-bank"
          label={method === "bank" ? "Nama bank" : "Nama e-wallet"}
          value={bank}
          onChange={setBank}
          placeholder={method === "bank" ? "BCA" : "GoPay"}
        />
        <Kolom
          id="pr-number"
          label={method === "bank" ? "Nomor rekening" : "Nomor terdaftar"}
          value={number}
          onChange={setNumber}
          placeholder={method === "bank" ? "1234567890" : "08xxxxxxxxxx"}
          inputMode="numeric"
        />
        <Kolom
          id="pr-name"
          label="Nama pemilik"
          value={name}
          onChange={setName}
          placeholder="Sesuai buku tabungan"
        />

        {keluhan && <p className="text-xs text-destructive">{keluhan}</p>}

        <Button onClick={simpan} disabled={menyimpan} className="h-11 w-full gap-2 sm:w-auto">
          <Wallet className="h-4 w-4" />
          {menyimpan ? "Menyimpan…" : "Simpan tujuan pembayaran"}
        </Button>
      </div>
    </section>
  );
}

function Kolom({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  inputMode?: "numeric";
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

// ─── Belum jadi partner ───

function Menunggu({ appliedAt }: { appliedAt?: string }) {
  return (
    <section className="rounded-xl border border-border bg-card px-5 py-6">
      <h2 className="font-display text-base font-semibold text-foreground">
        Pengajuanmu sudah masuk
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {appliedAt ? `Dikirim ${tanggal(appliedAt)}. ` : ""}
        Kami baca satu per satu, jadi jawabannya tidak otomatis. Kalau disetujui,
        halaman ini berganti sendiri jadi rincian komisi.
      </p>
    </section>
  );
}

function Ditolak({ onKirim }: { onKirim: () => void }) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card px-5 py-6">
        <h2 className="font-display text-base font-semibold text-foreground">
          Pengajuan sebelumnya belum diterima
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Kamu boleh mengajukan lagi. Kalau situasimu berubah, misalnya sekarang
          sudah pegang kelas, ceritakan di bawah.
        </p>
      </section>
      <Formulir onKirim={onKirim} ctaLabel="Ajukan lagi" />
    </div>
  );
}

function Tawaran({ ladder, onKirim }: { ladder: Band[]; onKirim: () => void }) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          Cara kerjanya
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Temanmu daftar pakai kodemu dan membeli akses. Begitu pembeliannya kami
          setujui, bagianmu tercatat. Sekali per orang: perpanjangannya nanti tidak
          dihitung lagi.
        </p>
        <ul className="mt-4 space-y-1.5">
          {ladder.map((b) => (
            <li
              key={b.percent}
              className="flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5 text-sm text-muted-foreground"
            >
              <span>
                Orang ke-{b.from}
                {b.to === null ? " ke atas" : ` sampai ke-${b.to}`}
              </span>
              <span className="font-semibold text-foreground">{b.percent}%</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Hitungannya dari harga yang benar-benar dibayar temanmu, setelah diskon
          kalau ada.
        </p>
      </section>

      <Formulir onKirim={onKirim} ctaLabel="Kirim pengajuan" />
    </div>
  );
}

function Formulir({ onKirim, ctaLabel }: { onKirim: () => void; ctaLabel: string }) {
  const [pitch, setPitch] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [keluhan, setKeluhan] = useState<string | null>(null);
  const MIN = 20;

  /**
   * Tombolnya tidak dimatikan karena tulisannya masih pendek.
   *
   * Tombol yang mati karena sesuatu yang belum diisi hanya memberi tahu kalau
   * orangnya memperhatikan bahwa warnanya meredup. Yang menekan dan tidak
   * terjadi apa-apa tidak diberi tahu apa pun. Jadi tekanannya diterima, lalu
   * dijawab: kurang berapa, dan kursornya dikembalikan ke kolomnya.
   */
  const kirim = async () => {
    const kurangNow = MIN - pitch.trim().length;
    if (kurangNow > 0) {
      setKeluhan(`Kurang ${kurangNow} karakter lagi sebelum bisa dikirim.`);
      document.getElementById("pr-pitch")?.focus();
      return;
    }
    setKeluhan(null);
    setMengirim(true);
    try {
      const res = await fetch("/api/partner/apply", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pitch }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Gagal mengirim.");
        return;
      }
      toast.success("Pengajuan terkirim.");
      onKirim();
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setMengirim(false);
    }
  };

  const kurang = Math.max(0, MIN - pitch.trim().length);

  return (
    <section>
      <h2 className="font-display text-base font-semibold text-foreground">
        Ceritakan sedikit
      </h2>
      <label htmlFor="pr-pitch" className="mt-1 block text-sm text-muted-foreground">
        Kamu mengajar siapa, kelas apa, kira-kira berapa orang. Itu yang kami baca
        saat memutuskan.
      </label>
      <textarea
        id="pr-pitch"
        value={pitch}
        onChange={(e) => {
          setPitch(e.target.value);
          if (keluhan) setKeluhan(null);
        }}
        rows={4}
        maxLength={1000}
        aria-describedby="pr-pitch-hitung"
        aria-invalid={keluhan ? true : undefined}
        placeholder="Saya mentor B29, pegang satu kelas B30 isinya sekitar 20 orang."
        className={cn(
          "mt-2 w-full resize-y rounded-lg border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2",
          keluhan
            ? "border-destructive focus:border-destructive focus:ring-destructive/30"
            : "border-border focus:border-primary focus:ring-primary/30"
        )}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p
          id="pr-pitch-hitung"
          className={cn("text-xs", keluhan ? "text-destructive" : "text-muted-foreground")}
        >
          {keluhan ??
            (kurang > 0 ? `Kurang ${kurang} karakter lagi.` : `${pitch.trim().length} karakter.`)}
        </p>
        <Button onClick={kirim} disabled={mengirim} className="h-11">
          {mengirim ? "Mengirim…" : ctaLabel}
        </Button>
      </div>
    </section>
  );
}
