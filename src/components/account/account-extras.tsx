"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Gift, Loader2, MailWarning, ShieldAlert } from "lucide-react";

import { easeEnter } from "@/lib/motion";

import { DisclosureCard } from "@/components/account/disclosure-card";
import { toast } from "@/components/ui/toast";
import type { AccountReferral } from "@/lib/auth/account-access";
import {
  FREE_PERIOD_TARGET,
  REFEREE_DISCOUNT,
  REFERRER_CREDIT,
} from "@/lib/referral/rewards";

/**
 * Referral code, what it has earned, and who came through it.
 *
 * The count is deliberately split in two. "Sudah dipakai 4 orang" on its own
 * is the number people argue about — they shared it with eight friends and see
 * four, and assume it is broken. Showing joined-but-not-bought separately from
 * bought-and-approved answers that before it is asked, and makes it obvious
 * why the ladder has not moved.
 */
export function AccountReferralCard({
  referral,
  hasNickname = true,
}: {
  referral: AccountReferral | null;
  /** Without one there is nothing to build a code out of — see below. */
  hasNickname?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showList, setShowList] = useState(false);
  const reduced = useReducedMotion();

  if (!referral) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground">Kode referral</p>
        {/* Two different reasons, two different answers.
            "Muat ulang sebentar lagi" is true while the code is still being
            written, and a lie for someone with no nickname — no amount of
            reloading will produce one, because the code is built out of the
            nickname. Sending them to the field that unblocks it is the whole
            job of this state. */}
        {hasNickname ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Kode referralmu belum siap. Muat ulang halaman ini sebentar lagi.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Kodemu dibuat dari nama panggilanmu, biar gampang disebut dan
              diketik teman. Isi nama panggilan dulu, kodenya langsung jadi.
            </p>
            <Link
              href="/account/profile"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Isi nama panggilan
            </Link>
          </>
        )}
      </div>
    );
  }

  const p = referral.progress;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referral.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Gift className="h-4 w-4 text-primary" />
        Kode referral
      </p>
      {/* Both numbers come from the constants that actually pay them out. They
          were typed by hand before and had already drifted — the card promised
          the newcomer Rp2.000 while the rule gave Rp5.000. */}
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Teman kamu dapat potongan {formatRupiah(REFEREE_DISCOUNT)}, kamu dapat saldo{" "}
        {formatRupiah(REFERRER_CREDIT)} tiap teman yang beli.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 truncate rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm text-foreground">
          {referral.code}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          {copied ? "Tersalin" : "Salin"}
        </button>
      </div>

      {/* Two numbers, not one. "Sudah dipakai 4 orang" is the number people
          dispute; separating those who only signed up from those who actually
          bought explains why the reward has not moved. */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-background px-3.5 py-2.5">
          <p className="font-display text-xl font-bold text-primary">{p.credited}</p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            sudah beli &amp; disetujui
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background px-3.5 py-2.5">
          <p className="font-display text-xl font-bold text-foreground">{p.pending}</p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            daftar, belum beli
          </p>
        </div>
      </div>

      {/* The balance first, because it is the thing that is actually theirs.
          The five-rung list this replaces had two problems that no amount of
          spacing fixes: the rupiah column went ragged wherever a rung carried a
          label, and every rung read as its own separate prize when the numbers
          are really one running total. A track with five ticks says "one number,
          growing" in the shape itself. */}
      <div className="mt-3 rounded-xl border border-border bg-background px-4 py-3.5">
        <p className="text-xs text-muted-foreground">Saldo kamu</p>
        <p className="font-display text-2xl font-bold leading-tight text-primary">
          {formatRupiah(p.balance)}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Otomatis mengurangi harga saat kamu beli periode berikutnya.
          {p.expiringAt && (
            <> Hangus kalau tidak dipakai sampai {formatDate(p.expiringAt)}.</>
          )}
        </p>

        <ReferralTrack credited={p.credited} reduced={Boolean(reduced)} />

        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          {p.toFree > 0 ? (
            <>
              <span className="font-semibold text-foreground">{p.toFree} teman lagi</span>{" "}
              &rarr; {formatRupiah(FREE_TARGET_AMOUNT)}, satu periode Share gratis
            </>
          ) : (
            <>
              Sudah cukup untuk satu periode Share gratis. Tiap teman berikutnya tetap
              menambah {formatRupiah(REFERRER_CREDIT)}.
            </>
          )}
        </p>
      </div>

      {referral.invitees.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowList((v) => !v)}
            aria-expanded={showList}
            className="rounded text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {showList ? "Sembunyikan" : `Lihat ${referral.invitees.length} orang yang pakai kodemu`}
          </button>

          <AnimatePresence initial={false}>
            {showList && (
              <motion.ul
                key="invitees"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { duration: reduced ? 0 : 0.24, ease: easeEnter },
                  opacity: { duration: reduced ? 0 : 0.16 },
                }}
                style={{ overflow: "hidden" }}
                className="mt-2.5 flex flex-col divide-y divide-border rounded-xl border border-border"
              >
                {referral.invitees.map((inv, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{inv.who}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(inv.joinedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-semibold ${
                        inv.credited ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {inv.credited ? "dihitung" : "belum beli"}
                    </span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/** The top of the track. Every friend is worth the same, so this is just N × it. */
const FREE_TARGET_AMOUNT = FREE_PERIOD_TARGET * REFERRER_CREDIT;

/**
 * The run to a free period, as a single track.
 *
 * The ticks are numbers only. The sentence directly underneath already says
 * "N teman lagi", so the unit is never in doubt — and writing "5 teman" under
 * the last tick would either hang off the right edge or sit visibly off its own
 * dot, which is the exact kind of half-millimetre wrongness that made the old
 * version look untidy.
 */
function ReferralTrack({
  credited,
  reduced,
}: {
  credited: number;
  reduced: boolean;
}) {
  const ticks = Array.from({ length: FREE_PERIOD_TARGET }, (_, i) => i + 1);
  const reached = Math.min(credited, FREE_PERIOD_TARGET);
  const pct = (reached / FREE_PERIOD_TARGET) * 100;

  return (
    // The right margin is half a tick wide, so the last tick — centred on 100%
    // — keeps its outer half inside the card instead of over the border.
    <div className="mr-1.5 mt-4">
      <div className="relative h-3">
        <div className="absolute inset-y-0 my-auto h-[3px] w-full rounded-full bg-border">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: reduced ? 0 : 0.75, ease: easeEnter }}
          />
        </div>
        {ticks.map((n) => (
          <span
            key={n}
            aria-hidden="true"
            style={{ left: `${(n / FREE_PERIOD_TARGET) * 100}%` }}
            className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors ${
              credited >= n
                ? "border-primary bg-primary"
                : "border-border bg-background"
            }`}
          />
        ))}
      </div>
      <div className="relative mt-2 h-3">
        {ticks.map((n) => (
          <span
            key={n}
            style={{ left: `${(n / FREE_PERIOD_TARGET) * 100}%` }}
            className={`absolute -translate-x-1/2 text-[10px] leading-none ${
              credited >= n ? "font-semibold text-foreground" : "text-muted-foreground"
            }`}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatRupiah(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Exactly what goes, said plainly before anything is typed.
 *
 * Two of these used to be wrong, and they were the two that matter most.
 *
 * "Semua sesi di semua perangkat langsung berakhir" said LANGSUNG when nothing
 * happens for seven days, and it was not true even then: the purge deletes the
 * `accounts` row, while the licence that actually opens the app carries
 * `on delete set null` and survives it.
 *
 * "Akses yang masih berjalan, termasuk yang sudah kamu bayar" said the paid
 * access goes. It does not. Telling someone their purchase would be destroyed
 * is the one error here that could talk a person out of a decision they were
 * entitled to make.
 */
const WHAT_GOES = [
  "Cara masuk kamu: email dan password ini tidak bisa dipakai lagi",
  "Data diri: nama, panggilan, WhatsApp, kampus, angkatan, dan foto profil",
  "Kode referral kamu, beserta hitungan orang yang sudah memakainya",
  "Halaman Akun: mengatur perangkat, melihat riwayat pembelian, semuanya ikut hilang",
];

/** What survives, said just as plainly. Silence here reads as "it all goes". */
const WHAT_STAYS = [
  "Akses yang sudah kamu bayar tetap jalan sampai masa berlakunya habis",
  "Pesan yang pernah kamu kirim ke orang lain tetap ada di percakapan mereka",
  "Catatan pembelian disimpan untuk pembukuan",
];

/**
 * Closing an account.
 *
 * Three deliberate changes from the version this replaces.
 *
 * The confirmation is your OWN e-mail address, not a fixed phrase. "HAPUS AKUN
 * SAYA" was printed on the screen directly above the box asking for it, so
 * anyone holding a borrowed session could copy it — it proved someone could
 * read, not that the account was theirs.
 *
 * Nothing happens on press. A link goes to the address that owns the account,
 * and only clicking that link schedules anything. That is the step that
 * actually establishes ownership.
 *
 * Having live paid access no longer blocks it. It used to, which meant the
 * people with the most at stake were the only ones who could not do this
 * themselves. The seven-day window is what makes having something to lose
 * survivable, and it is a better answer than a locked button.
 */
export function AccountDeletion({
  email,
  scheduledAt,
  whatsappHref,
}: {
  email: string;
  /** Set once a deletion is already scheduled. Nulled by cancelling. */
  scheduledAt: string | null;
  whatsappHref: string;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  const request = async () => {
    if (busy || !matches) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: typed.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Gagal mengirim email konfirmasi");
        return;
      }
      setSent(true);
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  // Already scheduled. The only useful thing to show here is the way out; a
  // second delete form would just be a way to ask for a mail they already have.
  if (scheduledAt) {
    return <DeletionScheduled scheduledAt={scheduledAt} />;
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MailWarning className="h-4 w-4 text-muted-foreground" />
          Cek emailmu
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Kami kirim tautan konfirmasi ke <span className="font-medium text-foreground">{email}</span>.
          Akunmu belum terhapus dan belum dijadwalkan apa-apa sampai kamu klik tautan itu.
          Tautannya berlaku 1 jam.
        </p>
      </div>
    );
  }

  return (
    <DisclosureCard
      title="Hapus akun"
      hint="Butuh konfirmasi lewat email dulu, dan masih bisa dibatalkan 7 hari."
      icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
      tone="danger"
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        Kami kirim tautan konfirmasi ke emailmu dulu. Setelah kamu klik, akunmu
        dijadwalkan dihapus <strong className="text-foreground">7 hari</strong> kemudian,
        dan masih bisa dibatalkan selama itu.
      </p>

      <div className="mt-4 rounded-xl border border-destructive/25 bg-background/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
          Yang ikut terhapus setelah 7 hari
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {WHAT_GOES.map((line) => (
            <li key={line} className="flex gap-2 text-xs leading-relaxed text-foreground">
              <span aria-hidden="true" className="text-destructive">
                &bull;
              </span>
              {line}
            </li>
          ))}
        </ul>
      </div>

      {/* Said as its own list, not as a footnote. What survives is the half
          people actually worry about, and burying it under the deletions is how
          someone concludes their paid access dies with the account. */}
      <div className="mt-3 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Yang tetap ada
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {WHAT_STAYS.map((line) => (
            <li key={line} className="flex gap-2 text-xs leading-relaxed text-foreground">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Semuanya sudah tidak terhubung ke kamu lagi.
        </p>
      </div>

      <label htmlFor="delete-email" className="mt-4 block text-xs font-medium text-muted-foreground">
        Ketik email akunmu untuk melanjutkan
      </label>
      <input
        id="delete-email"
        type="email"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={email}
        autoComplete="off"
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-destructive focus:ring-2 focus:ring-destructive/25"
      />

      <button
        type="button"
        onClick={request}
        disabled={busy || !matches}
        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-destructive px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Kirim email konfirmasi
      </button>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Ada yang bisa dibantu dulu?{" "}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline underline-offset-2"
        >
          Chat admin
        </a>
        .
      </p>
    </DisclosureCard>
  );
}

/**
 * The banner and the undo, once a deletion is pending.
 *
 * Cancelling from here needs no token: whoever is signed in is by definition
 * the account holder, and sending them to hunt through their inbox to undo
 * something they can already see on screen would be ceremony, not safety.
 */
export function DeletionScheduled({ scheduledAt }: { scheduledAt: string }) {
  const [busy, setBusy] = useState(false);
  const deleteOn = new Date(
    new Date(scheduledAt).getTime() + 7 * 24 * 60 * 60 * 1000
  ).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete/cancel", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Gagal membatalkan");
        return;
      }
      // A full reload: the pending state is rendered on the server, so a
      // re-render would keep showing a banner for something already cancelled.
      window.location.reload();
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <p className="text-sm leading-relaxed text-foreground">
          Akun ini dijadwalkan dihapus pada{" "}
          <span className="font-semibold">{deleteOn}</span>.
          <span className="text-muted-foreground">
            {" "}
            Sampai tanggal itu semuanya masih jalan seperti biasa.
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-background px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Batalkan
      </button>
    </div>
  );
}
