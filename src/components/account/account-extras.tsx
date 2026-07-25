"use client";

import { useState } from "react";
import { Check, Copy, Gift, Loader2, ShieldAlert } from "lucide-react";

import { useTranslation } from "@/components/providers/language-provider";
import { refreshAccount } from "@/hooks/use-account";
import { toast } from "@/components/ui/toast";
import type { AccountReferral } from "@/lib/auth/account-access";

/**
 * Referral code.
 *
 * The code is generated per activation, not per account, so someone who has
 * never opened an access genuinely does not have one yet. Saying that plainly
 * beats inventing a code that credits nobody.
 */
export function AccountReferralCard({ referral }: { referral: AccountReferral | null }) {
  const [copied, setCopied] = useState(false);

  if (!referral) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground">Kode referral</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Kode referralmu muncul setelah kamu punya akses dan pertama kali membukanya.
        </p>
      </div>
    );
  }

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
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Bagikan ke temanmu. Sudah dipakai {referral.used} orang.
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
    </div>
  );
}

/** Language, stored on the account so it follows you between devices. */
export function AccountLanguage({ initial }: { initial: "id" | "en" }) {
  const { setLocale } = useTranslation();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  const pick = async (next: "id" | "en") => {
    if (saving || next === value) return;
    setValue(next);
    setSaving(true);
    // Applied immediately; the save is what makes it survive a new device.
    setLocale(next);
    try {
      await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: next }),
      });
      refreshAccount();
    } catch {
      toast.error("Gagal menyimpan bahasa");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Bahasa</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Tersimpan di akun, jadi ikut ke perangkat lain.
        </p>
      </div>
      <div className="flex gap-1 rounded-xl border border-border p-1">
        {(["id", "en"] as const).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => pick(code)}
            className={
              value === code
                ? "rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
                : "rounded-lg px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {code === "id" ? "Indonesia" : "English"}
          </button>
        ))}
      </div>
    </div>
  );
}

const DELETE_PHRASE = "HAPUS AKUN SAYA";

/** Exactly what goes, said plainly before anything is typed. */
const WHAT_GOES = [
  "Cara masuk kamu: email dan password ini tidak bisa dipakai lagi",
  "Data diri: nama, panggilan, WhatsApp, kampus, angkatan, dan foto profil",
  "Semua sesi di semua perangkat langsung berakhir",
  "Kode referral kamu, beserta hitungan orang yang sudah memakainya",
  "Akses yang sudah berakhir tidak bisa dipulihkan lagi",
];

/**
 * Closing an account.
 *
 * The account holder does this alone — no admin in the middle, no waiting.
 * Two things keep it from being a footgun: an account still holding live paid
 * access is blocked outright, and the phrase has to be typed by hand. A second
 * "are you sure" button is something people click through on reflex; copying a
 * phrase cannot be done by accident and forces a pause long enough to read
 * the list above it.
 */
export function AccountDeletion({
  hasActiveAccess,
  whatsappHref,
}: {
  hasActiveAccess: boolean;
  whatsappHref: string;
}) {
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: phrase }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Gagal menghapus akun");
        return;
      }
      // Full navigation: the account is gone, so every provider still holding
      // its state has to be torn down rather than re-rendered.
      window.location.href = "/";
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  if (hasActiveAccess) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          Hapus akun
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Akunmu masih punya akses aktif yang sudah dibayar, jadi belum bisa dihapus dari
          sini. Hubungi admin dulu supaya aksesnya tidak hilang begitu saja.
        </p>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Hubungi admin
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldAlert className="h-4 w-4 text-destructive" />
        Hapus akun permanen
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Setelah dihapus, akun ini tidak bisa dikembalikan, oleh kamu maupun oleh admin.
      </p>

      <div className="mt-4 rounded-xl border border-destructive/25 bg-background/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
          Yang ikut terhapus
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
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Catatan pembelian tetap kami simpan sebagai bukti transaksi, tapi sudah tidak
          terhubung ke kamu lagi.
        </p>
      </div>

      <label
        htmlFor="delete-phrase"
        className="mt-4 block text-xs font-medium text-muted-foreground"
      >
        Ketik <span className="font-mono font-semibold text-foreground">{DELETE_PHRASE}</span>{" "}
        untuk melanjutkan
      </label>
      <input
        id="delete-phrase"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        placeholder={DELETE_PHRASE}
        autoComplete="off"
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 font-mono text-sm text-foreground outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/40 focus:border-destructive focus:ring-2 focus:ring-destructive/25"
      />

      <button
        type="button"
        onClick={remove}
        disabled={busy || phrase.trim().toUpperCase() !== DELETE_PHRASE}
        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-destructive px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Hapus akun saya
      </button>
    </div>
  );
}
