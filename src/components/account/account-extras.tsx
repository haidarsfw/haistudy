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

/**
 * Danger zone.
 *
 * A request, not an instant wipe, and blocked outright while access is still
 * live. There is no automated refund behind this, so a mis-click would destroy
 * something that was paid for with nothing able to undo it.
 */
export function AccountDangerZone({
  hasActiveAccess,
  alreadyRequested,
  whatsappHref,
}: {
  hasActiveAccess: boolean;
  alreadyRequested: boolean;
  whatsappHref: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(alreadyRequested);

  const request = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete-request", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Gagal mengirim permintaan");
        return;
      }
      setSent(true);
      setConfirming(false);
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldAlert className="h-4 w-4 text-destructive" />
        Hapus akun
      </p>

      {sent ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Permintaan hapus akun sudah kami terima. Admin akan menghubungimu lewat email
          atau WhatsApp sebelum apa pun dihapus.
        </p>
      ) : hasActiveAccess ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Akunmu masih punya akses aktif yang sudah dibayar. Hubungi admin dulu supaya
            aksesnya tidak hilang begitu saja.
          </p>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Hubungi admin
          </a>
        </>
      ) : confirming ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Yakin? Semua data akunmu akan dihapus setelah admin memproses permintaan ini.
            Langkah ini tidak bisa dibatalkan sendiri.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={request}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-destructive px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, kirim permintaan
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Batal
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Permintaan dikirim ke admin dulu, tidak langsung terhapus, supaya tidak ada
            yang hilang karena salah pencet.
          </p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-destructive/40 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            Minta hapus akun
          </button>
        </>
      )}
    </div>
  );
}
