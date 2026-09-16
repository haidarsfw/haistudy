"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Play, X } from "lucide-react";
import { KARAKTER, URUTAN, type KunciKarakter } from "./karakter";

/**
 * Peraga gerak — SEMENTARA.
 *
 * Tugasnya satu: memperlihatkan tiga watak gerak pada permukaan yang sama,
 * supaya bisa dibandingkan dengan mata, bukan dibayangkan dari angka. Setiap
 * kotak di bawah adalah permukaan yang benar-benar ada di situs, bukan contoh
 * karangan — makanya yang dipilih di sini bisa langsung dipasang ke seluruh
 * situs tanpa menerjemahkan apa-apa.
 */
export function GerakDemo() {
  const [kunci, setKunci] = useState<KunciKarakter>("halus");
  const k = KARAKTER[kunci];

  // Ganti karakter = ulang semua peraga, supaya perbedaannya langsung terlihat
  // tanpa harus menyentuh satu per satu. Dinaikkan di dalam penangan klik, bukan
  // di dalam efek — mengubah state di efek memicu render berantai.
  const [putaran, setPutaran] = useState(0);
  const ulang = useCallback(() => setPutaran((n) => n + 1), []);
  const pilih = useCallback((key: KunciKarakter) => { setKunci(key); ulang(); }, [ulang]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-5 pb-32 pt-10 sm:px-8">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Halaman sementara</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Pilih watak geraknya</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Tiga watak, permukaan yang sama persis. Ganti di bawah, lalu perhatikan
          benda yang sama bergerak berbeda. Yang kamu pilih akan dipasang ke
          seluruh situs — popup, tab, pindah halaman, notifikasi, semuanya.
        </p>
      </header>

      {/* ── pemilih watak ── */}
      <div className="sticky top-3 z-40 mb-12">
        <div className="rounded-2xl border border-foreground/10 bg-background/80 p-2 backdrop-blur-xl">
          <div className="grid gap-2 sm:grid-cols-3">
            {URUTAN.map((key) => {
              const kk = KARAKTER[key];
              const aktif = key === kunci;
              return (
                <motion.button
                  key={key}
                  onClick={() => pilih(key)}
                  whileHover={aktif ? undefined : kk.hoverTombol}
                  whileTap={kk.tekan}
                  className={[
                    // Yang tidak aktif tetap harus terlihat bisa diklik. Tanpa
                    // batas sendiri, dua pilihan sisanya terbaca sebagai
                    // keterangan, bukan pilihan.
                    "relative rounded-xl px-4 py-3 text-left transition-colors",
                    aktif
                      ? "text-background"
                      : "border border-foreground/12 text-foreground hover:border-foreground/25 hover:bg-foreground/5",
                  ].join(" ")}
                >
                  {aktif && (
                    <motion.span
                      layoutId="watak-aktif"
                      transition={kk.penanda}
                      className="absolute inset-0 rounded-xl bg-primary"
                    />
                  )}
                  <span className="relative block text-sm font-semibold">{kk.nama}</span>
                  <span className={["relative mt-0.5 block text-xs", aktif ? "text-background/70" : "text-muted-foreground"].join(" ")}>
                    {kk.sifat}
                  </span>
                </motion.button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-1 pt-3">
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground">{k.rasa}</span> <span className="opacity-60">· {k.angka}</span>
            </p>
            <button
              onClick={ulang}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-foreground/15 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Play className="size-3" /> Putar ulang
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-14">
        <Bagian
          judul="Popup"
          catatan="Dialog QRIS, konfirmasi perangkat baru, keluar ujian. Ini yang paling kamu keluhkan."
        >
          <PeragaPopup k={k} />
        </Bagian>

        <Bagian judul="Pindah tab" catatan="Tab di dalam mata kuliah, dan langkah-langkah di halaman bayar.">
          <PeragaTab k={k} />
        </Bagian>

        <Bagian judul="Pindah halaman" catatan="Setiap kali sidebar diklik dan isi layar berganti.">
          <PeragaHalaman k={k} putaran={putaran} />
        </Bagian>

        <Bagian judul="Daftar yang datang" catatan="Kartu mata kuliah, riwayat, daftar perangkat.">
          <PeragaDaftar k={k} putaran={putaran} />
        </Bagian>

        <Bagian judul="Sentuh & tekan" catatan="Kartu paket, tombol, semua yang bisa diklik.">
          <PeragaSentuh k={k} />
        </Bagian>

        <Bagian judul="Notifikasi & panel buka" catatan="Toast dan bagian yang membuka ke bawah.">
          <PeragaToastBuka k={k} />
        </Bagian>
      </div>

      <p className="mt-20 border-t border-foreground/10 pt-6 text-xs text-muted-foreground">
        Halaman ini dihapus setelah kamu memilih. Tidak ada tautan ke sini dari mana pun.
      </p>
    </main>
  );
}

/* ─────────────────────────── kerangka satu bagian ────────────────────────── */

function Bagian({ judul, catatan, children }: { judul: string; catatan: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">{judul}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{catatan}</p>
      </div>
      <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Tombol({
  k, children, onClick, utama = false,
}: { k: (typeof KARAKTER)[KunciKarakter]; children: React.ReactNode; onClick?: () => void; utama?: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={k.hoverTombol}
      whileTap={k.tekan}
      className={[
        "rounded-xl px-4 py-2.5 text-sm font-medium",
        utama ? "bg-primary text-background" : "border border-foreground/15 text-foreground hover:bg-foreground/5",
      ].join(" ")}
    >
      {children}
    </motion.button>
  );
}

/* ─────────────────────────────── popup ───────────────────────────────────── */

function PeragaPopup({ k }: { k: (typeof KARAKTER)[KunciKarakter] }) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Tombol k={k} onClick={() => setBuka(true)} utama>Buka popup</Tombol>
        <p className="text-xs text-muted-foreground">Tutup pakai tombol atau klik latarnya — perhatikan juga cara dia pergi.</p>
      </div>

      <AnimatePresence>
        {buka && (
          <div className="fixed inset-0 z-50 grid place-items-center p-5">
            <motion.div
              variants={k.tirai} initial="hidden" animate="visible" exit="exit"
              onClick={() => setBuka(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              variants={k.popup} initial="hidden" animate="visible" exit="exit"
              className="relative w-full max-w-sm rounded-2xl border border-foreground/10 bg-background p-6 shadow-2xl"
            >
              <button
                onClick={() => setBuka(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
              <h3 className="text-base font-semibold">Perangkat baru</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Melanjutkan akan memakai 1 jatah perangkat dari 3. Sisa setelah ini 2.
              </p>
              <div className="mt-5 flex gap-2">
                <Tombol k={k} onClick={() => setBuka(false)} utama>Ya, ini perangkat saya</Tombol>
                <Tombol k={k} onClick={() => setBuka(false)}>Batal</Tombol>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ──────────────────────────────── tab ────────────────────────────────────── */

const TAB = ["Materi", "Rangkuman", "Latihan Soal"];
const ISI_TAB = [
  "Slide dan rekaman kelas, dikelompokkan per modul.",
  "Ringkasan yang bisa kamu sorot dan tandai sendiri.",
  "Soal buatan AI, dinilai dan disimpan riwayatnya.",
];

function PeragaTab({ k }: { k: (typeof KARAKTER)[KunciKarakter] }) {
  // Arah disimpan sebagai state, bukan ref: nilainya ikut dibaca saat render
  // (dilempar ke `custom`), dan itu memang bukan pekerjaan ref.
  const [{ i, arah }, setTab] = useState({ i: 0, arah: 1 });
  const pindah = (n: number) => setTab((t) => ({ i: n, arah: n > t.i ? 1 : -1 }));
  const V = k.panel(14);

  return (
    <div>
      <div className="relative flex gap-1 border-b border-foreground/10">
        {TAB.map((t, n) => (
          <button
            key={t}
            onClick={() => pindah(n)}
            className={[
              "relative px-3 py-2.5 text-sm transition-colors",
              n === i ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t}
            {n === i && (
              <motion.span layoutId="tab-penanda" transition={k.penanda} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
      <div className="relative mt-4 min-h-24 overflow-hidden">
        <AnimatePresence mode="wait" custom={arah}>
          <motion.div key={i} custom={arah} variants={V} initial="hidden" animate="visible" exit="exit">
            <p className="text-sm text-muted-foreground">{ISI_TAB[i]}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((n) => (
                <div key={n} className="rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-4">
                  <div className="h-2 w-2/3 rounded-full bg-foreground/15" />
                  <div className="mt-2 h-2 w-1/3 rounded-full bg-foreground/10" />
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────────────────────── pindah halaman ────────────────────────────── */

const HALAMAN = ["Dashboard", "Mata Kuliah", "Jadwal Ujian"];

function PeragaHalaman({ k, putaran }: { k: (typeof KARAKTER)[KunciKarakter]; putaran: number }) {
  // `putaran` ikut jadi kunci di bawah, jadi peraga ini sudah terulang sendiri
  // saat watak diganti — tanpa perlu efek yang mereset state.
  const [i, setI] = useState(0);

  return (
    <div className="grid gap-5 sm:grid-cols-[168px_1fr]">
      <nav className="flex gap-1 sm:flex-col">
        {HALAMAN.map((h, n) => (
          <button
            key={h}
            onClick={() => setI(n)}
            className={[
              "rounded-lg px-3 py-2 text-left text-sm transition-colors",
              n === i ? "bg-foreground/8 text-foreground" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {h}
          </button>
        ))}
      </nav>
      <div className="min-h-40 rounded-xl border border-foreground/10 bg-background p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${i}-${putaran}`}
            initial={{ opacity: 0, y: k.kunci === "cepat" ? 12 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              k.kunci === "pegas"
                ? { type: "spring", stiffness: 400, damping: 34 }
                : { duration: k.kunci === "cepat" ? 0.15 : 0.24, ease: [0.16, 1, 0.3, 1] }
            }
          >
            <h3 className="text-base font-semibold">{HALAMAN[i]}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">Isi halaman berganti. Ini gerak yang paling sering kamu lihat.</p>
            <div className="mt-4 space-y-2">
              {[0, 1, 2].map((n) => (
                <div key={n} className="h-9 rounded-lg bg-foreground/[0.04]" />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────────────────────────── daftar ──────────────────────────────────── */

const MAPEL = ["Akuntansi", "Business Ethics", "Operations Management", "Foundations of AI"];

function PeragaDaftar({ k, putaran }: { k: (typeof KARAKTER)[KunciKarakter]; putaran: number }) {
  return (
    <motion.ul
      key={putaran}
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: k.jedaBaris } } }}
      className="grid gap-2 sm:grid-cols-2"
    >
      {MAPEL.map((m) => (
        <motion.li
          key={m}
          variants={k.baris}
          className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-background px-4 py-3"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-xs font-semibold text-primary">
            {m.slice(0, 2)}
          </span>
          <span className="text-sm">{m}</span>
        </motion.li>
      ))}
    </motion.ul>
  );
}

/* ────────────────────────────── sentuh & tekan ───────────────────────────── */

const PAKET = [
  { n: "Share", h: "Rp25.000", d: "1 device" },
  { n: "VIP", h: "Rp45.000", d: "2 device" },
  { n: "Diamond", h: "Rp65.000", d: "3 device" },
];

function PeragaSentuh({ k }: { k: (typeof KARAKTER)[KunciKarakter] }) {
  const [pilih, setPilih] = useState(1);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {PAKET.map((p, n) => (
        <motion.button
          key={p.n}
          onClick={() => setPilih(n)}
          whileHover={k.hoverKartu}
          whileTap={k.tekan}
          className={[
            "relative rounded-xl border p-4 text-left",
            n === pilih ? "border-primary bg-primary/[0.06]" : "border-foreground/10 bg-background",
          ].join(" ")}
        >
          <AnimatePresence>
            {n === pilih && (
              <motion.span
                variants={k.popup} initial="hidden" animate="visible" exit="exit"
                className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-primary text-background"
              >
                <Check className="size-3" />
              </motion.span>
            )}
          </AnimatePresence>
          <p className="text-sm font-semibold">{p.n}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{p.h}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{p.d}</p>
        </motion.button>
      ))}
    </div>
  );
}

/* ──────────────────────── notifikasi & panel buka ────────────────────────── */

function PeragaToastBuka({ k }: { k: (typeof KARAKTER)[KunciKarakter] }) {
  const [toast, setToast] = useState(false);
  const [buka, setBuka] = useState(false);
  const jam = useRef<number | null>(null);

  const munculkan = () => {
    setToast(true);
    if (jam.current) window.clearTimeout(jam.current);
    jam.current = window.setTimeout(() => setToast(false), 2600);
  };
  useEffect(() => () => { if (jam.current) window.clearTimeout(jam.current); }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Tombol k={k} onClick={munculkan}>Munculkan notifikasi</Tombol>
        <p className="text-xs text-muted-foreground">Muncul di pojok kanan atas.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background">
        <button onClick={() => setBuka((b) => !b)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm">
          <span>Ubah password</span>
          <motion.span animate={{ rotate: buka ? 180 : 0 }} transition={k.buka}>
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.span>
        </button>
        <motion.div
          initial={false}
          animate={{ height: buka ? "auto" : 0, opacity: buka ? 1 : 0 }}
          transition={k.buka}
          className="overflow-hidden"
        >
          <div className="space-y-2 border-t border-foreground/10 px-4 py-4">
            {[0, 1].map((n) => (
              <div key={n} className="h-10 rounded-lg border border-foreground/10 bg-foreground/[0.03]" />
            ))}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            variants={k.toast} initial="hidden" animate="visible" exit="exit"
            className="fixed right-5 top-5 z-50 flex items-center gap-2.5 rounded-xl border border-foreground/10 bg-background px-4 py-3 shadow-2xl"
          >
            <span className="grid size-5 place-items-center rounded-full bg-primary text-background"><Check className="size-3" /></span>
            <span className="text-sm">Perubahan tersimpan</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
