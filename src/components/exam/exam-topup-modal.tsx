"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Check, Upload, Loader2, Copy, Sparkles, Ticket, Download } from "lucide-react";
import { QUOTA_PACKS } from "@/lib/exam/quota";
import { PAYMENT_ACCOUNTS, WA_ADMIN } from "@/lib/payments";
import { compressImageToBudget } from "@/lib/image";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";

interface Props {
  subjectId: string;
  subjectName: string;
  onClose: () => void;
  /** Called after a successful submit so the launch screen can refresh quota. */
  onSubmitted?: () => void;
}

type Method = "bca" | "ewallet" | "qris";

const idr = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

/**
 * In-app exam-quota top-up. The buyer is already logged in, so there's no
 * re-registration — pick a pack, transfer the flat price, upload proof. Admin
 * approval adds the credits to THIS subject + sends an in-app confirmation.
 */
export function ExamTopupModal({ subjectId, subjectName, onClose, onSubmitted }: Props) {
  const [qty, setQty] = useState<number>(QUOTA_PACKS[1]?.qty ?? 3);
  const [method, setMethod] = useState<Method>("bca");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // This modal is mounted only while open, so wire a11y unconditionally (Esc =
  // close, focus moves into the sheet, focus restored on unmount).
  const dialogRef = useDialogA11y<HTMLDivElement>(true, onClose);

  const pack = QUOTA_PACKS.find((p) => p.qty === qty) ?? QUOTA_PACKS[0];

  const onPick = async (f: File | null) => {
    if (!f) return;
    setError(null);
    try {
      const compressed = await compressImageToBudget(f, { maxBytes: 500 * 1024 });
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const copyNumber = (num: string) => {
    navigator.clipboard.writeText(num).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const submit = async () => {
    if (!file) {
      setError("Unggah bukti pembayaran dulu ya.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("subjectId", subjectId);
      fd.append("subjectName", subjectName);
      fd.append("qty", String(qty));
      fd.append("paymentMethod", method);
      fd.append("paymentProof", file);
      const res = await fetch("/api/exam/topup", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mengirim top-up.");
      setDone(true);
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim top-up.");
    } finally {
      setBusy(false);
    }
  };

  const acct = method === "qris" ? null : PAYMENT_ACCOUNTS[method];

  // Prefilled WhatsApp message to the admin (simplified vs the access-purchase
  // template, but keeps the key details).
  const waText = encodeURIComponent(
    `Halo admin, konfirmasi top-up kuota latihan:\n` +
      `• Mata kuliah: ${subjectName}\n` +
      `• Paket: ${qty}× attempt\n` +
      `• Total: ${idr(pack.price)}\n` +
      `Bukti pembayaran sudah saya unggah di aplikasi. Mohon dicek ya, terima kasih!`
  );
  const waHref = `https://wa.me/${WA_ADMIN}?text=${waText}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-topup-title"
        tabIndex={-1}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-2xl outline-none sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" />
            </span>
            <div>
              <h3 id="exam-topup-title" className="text-base font-black text-foreground">Top-up Kuota Latihan</h3>
              <p className="text-xs text-muted-foreground">{subjectName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="hs-press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="h-7 w-7 text-emerald-500" />
            </div>
            <h4 className="text-base font-bold text-foreground">Top-up terkirim!</h4>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
              Admin bakal verifikasi pembayaranmu. Kuota otomatis ditambah ke{" "}
              <span className="font-semibold text-foreground">{subjectName}</span> + kamu dapat
              notifikasi di app. Biasanya cepat 🙌
            </p>
            <div className="mt-4 flex gap-2">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hs-press flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground"
              >
                Hubungi Admin
              </a>
              <button
                type="button"
                onClick={onClose}
                className="hs-press flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Casual why-copy */}
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Setiap latihan soal dinilai oleh <span className="font-semibold text-foreground">AI</span> yang
                menggunakan token berbayar. Top-up membantu menutup biaya tersebut sekaligus memungkinkanmu lanjut
                berlatih tanpa menunggu reset kuota. Kuota ditambahkan khusus untuk{" "}
                <span className="font-semibold text-foreground">mata kuliah ini</span>.
              </p>
            </div>

            {/* Pack picker */}
            <p className="mb-2 text-xs font-bold text-foreground">Pilih paket</p>
            <div className="grid grid-cols-3 gap-2">
              {QUOTA_PACKS.map((p) => (
                <button
                  key={p.qty}
                  type="button"
                  onClick={() => setQty(p.qty)}
                  className={`hs-press rounded-xl border p-2.5 text-center transition-colors ${
                    qty === p.qty
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <p className="text-lg font-black text-foreground">{p.qty}×</p>
                  <p className="text-[10px] text-muted-foreground">attempt</p>
                  <p className="mt-1 text-xs font-bold text-primary">{idr(p.price)}</p>
                </button>
              ))}
            </div>

            {/* Payment method */}
            <p className="mb-2 mt-4 text-xs font-bold text-foreground">Metode bayar</p>
            <div className="flex gap-2">
              {(["bca", "ewallet", "qris"] as Method[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`hs-press flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    method === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {m === "bca" ? "BCA" : m === "ewallet" ? "E-Wallet" : "QRIS"}
                </button>
              ))}
            </div>

            {/* Destination */}
            <div className="mt-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              {method === "qris" ? (
                <div className="text-center">
                  {/* Slight zoom + clip removes the white margin baked into the
                      QRIS image; QR + finder patterns stay fully inside. */}
                  <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={PAYMENT_ACCOUNTS.qrisImage}
                      alt="QRIS HaiStudy"
                      className="block w-full origin-center scale-[1.06] object-cover"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <a
                      href={PAYMENT_ACCOUNTS.qrisImage}
                      download="qris-haistudy.jpg"
                      className="hs-press inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download QRIS
                    </a>
                    <span className="text-xs text-muted-foreground">bayar {idr(pack.price)}</span>
                  </div>
                </div>
              ) : acct ? (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {acct.label}
                    </p>
                    <p className="font-bold tabular-nums text-foreground">{acct.number}</p>
                    <p className="text-[10px] text-muted-foreground">a.n. {acct.holder}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyNumber(acct.number)}
                    className="hs-press flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                </div>
              ) : null}
              <p className="mt-2 border-t border-border pt-2 text-center text-xs">
                Total bayar: <span className="font-black text-foreground">{idr(pack.price)}</span>
              </p>
            </div>

            {/* Proof upload */}
            <p className="mb-2 mt-4 text-xs font-bold text-foreground">Bukti pembayaran</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="hs-press relative block w-full overflow-hidden rounded-xl border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Bukti" className="max-h-44 w-full object-contain bg-muted/40" />
                <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  Ganti
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="hs-press flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/20 py-6 text-muted-foreground"
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs font-semibold">Unggah screenshot transfer</span>
              </button>
            )}

            {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="hs-press mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              {busy ? "Mengirim…" : `Kirim Top-up ${qty}× · ${idr(pack.price)}`}
            </button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Verifikasi manual oleh admin. Kuota ditambah otomatis setelah disetujui.
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
