"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Landmark, Loader2, Wallet } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/components/providers/language-provider";
import { AccountRow, QrisCard } from "@/components/payments/pay-to";
import { FieldShell } from "@/components/payments/fields/field-shell";
import { FileUpload } from "@/components/payments/fields/file-upload";
import { RadioGroup } from "@/components/payments/fields/radio-group";
import { Section } from "@/components/payments/fields/section";
import {
  PAYMENT_ACCOUNTS,
  PAYMENT_METHODS,
  formatIDR,
  type PaymentMethodId,
} from "@/lib/payments";
import { cn } from "@/lib/utils";

export interface UpgradeChoice {
  to: "vip" | "diamond";
  label: string;
  price: number;
  /** price + the last three WhatsApp digits, the figure to transfer. */
  amount: number;
  /** Plain lines (numbers worked out from the code) and i18n keys, in order. */
  gains: { text?: string; key?: string }[];
}

/**
 * Naik paket: pick the tier, pay the difference, upload the proof.
 *
 * One screen rather than checkout's steps. Everything checkout asks before
 * payment (name, class, campus, devices) is already known for an access that
 * exists, so what is left fits in view: the choice, the amount, where to send
 * it, and the proof.
 */
export function UpgradeFlow({
  licenseKey,
  currentLabel,
  choices,
}: {
  licenseKey: string;
  currentLabel: string;
  choices: UpgradeChoice[];
}) {
  const { t } = useTranslation();
  const [to, setTo] = useState<UpgradeChoice["to"]>(choices[0].to);
  const [method, setMethod] = useState<PaymentMethodId | "">("");
  const [proof, setProof] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ method?: string; proof?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<UpgradeChoice | null>(null);
  const choice = choices.find((c) => c.to === to) ?? choices[0];

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Tersalin");
    } catch {
      toast.error("Browser menolak menyalin. Salin manual, ya.");
    }
  };

  const submit = async () => {
    const next: typeof errors = {};
    if (!method) next.method = "Pilih cara kamu membayar.";
    if (!proof) next.proof = "Unggah bukti pembayarannya.";
    setErrors(next);
    if (next.method || next.proof) return;

    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("licenseKey", licenseKey);
      fd.set("toTier", choice.to);
      fd.set("paymentMethod", method);
      fd.set("paymentProof", proof!);
      const res = await fetch("/api/account/upgrade", {
        method: "POST",
        credentials: "same-origin",
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Pesanan belum terkirim. Coba lagi.");
        return;
      }
      setDone(choice);
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6">
        <CheckCircle2 className="h-6 w-6 text-primary" />
        <p className="mt-3 text-base font-semibold text-foreground">
          Pesanan naik ke {done.label} sudah masuk
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Admin memeriksa pembayaranmu dulu. Begitu disetujui, paket akses ini langsung naik
          dan kamu dapat kabar di aplikasi. Masa aktifnya tetap sama.
        </p>
        <Link
          href="/account/access"
          className="mt-5 inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Kembali ke Akses saya
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title="Naik ke paket">
        <p className="text-sm text-muted-foreground">
          Sekarang: <span className="font-medium text-foreground">{currentLabel}</span>. Yang
          dibayar hanya selisih harganya, dan masa aktifnya tidak berubah.
        </p>
        <div className={cn("mt-3 grid gap-2.5", choices.length > 1 && "sm:grid-cols-2")}>
          {choices.map((c) => {
            const on = c.to === to;
            return (
              <button
                key={c.to}
                type="button"
                onClick={() => setTo(c.to)}
                aria-pressed={on}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  on ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/40"
                )}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">{c.label}</span>
                  <span className="font-display text-base font-bold text-foreground">
                    +{formatIDR(c.price)}
                  </span>
                </span>
                <ul className="mt-2 space-y-1">
                  {c.gains.map((g, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                      <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                      {g.key ? t(g.key) : g.text}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-x-5">
        <Section title={t("payments.sec_pay")}>
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 text-center">
            <p className="text-[11px] text-muted-foreground">{t("payments.amount_label")}</p>
            <button
              type="button"
              onClick={() => copy(String(choice.amount))}
              className="mt-0.5 inline-flex items-center gap-2 font-display text-3xl font-bold text-foreground"
            >
              {formatIDR(choice.amount)}
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {/* The suffix comes from the WhatsApp number on the account. An
                  account without one has no suffix, and "the last three digits
                  of your WA (000)" would describe a number that is not there. */}
              {choice.amount > choice.price
                ? t("payments.amount_unique_hint")
                    .replace("{base}", formatIDR(choice.price))
                    .replace("{digits}", String(choice.amount - choice.price).padStart(3, "0"))
                : "Transfer persis segini, jangan dibulatkan."}
            </p>
          </div>
          <div className="mt-3 space-y-2">
            <AccountRow
              icon={<Landmark className="h-4 w-4" />}
              label={PAYMENT_ACCOUNTS.bca.label}
              number={PAYMENT_ACCOUNTS.bca.number}
              holder={PAYMENT_ACCOUNTS.bca.holder}
              onCopy={() => copy(PAYMENT_ACCOUNTS.bca.number)}
              hint={t("payments.tap_to_copy")}
            />
            <AccountRow
              icon={<Wallet className="h-4 w-4" />}
              label={PAYMENT_ACCOUNTS.ewallet.label}
              number={PAYMENT_ACCOUNTS.ewallet.number}
              holder={PAYMENT_ACCOUNTS.ewallet.holder}
              onCopy={() => copy(PAYMENT_ACCOUNTS.ewallet.number)}
              hint={t("payments.tap_to_copy")}
            />
            <QrisCard
              label={t("payments.qris_label")}
              expandHint={t("payments.qris_expand")}
              openHint={t("payments.qris_open")}
              downloadLabel={t("payments.qris_download")}
            />
          </div>
        </Section>

        <Section title={t("payments.sec_confirm")}>
          <div className="space-y-4">
            <FieldShell label={t("payments.method_label")} required error={errors.method}>
              <RadioGroup
                name="method"
                variant="tile"
                value={method}
                onChange={(v) => setMethod(v as PaymentMethodId)}
                columns={3}
                options={PAYMENT_METHODS.map((m) => ({ value: m.id, label: t(m.labelKey) }))}
              />
            </FieldShell>
            <FieldShell
              label={t("payments.proof_pay_label")}
              description={t("payments.proof_pay_desc")}
              required
              error={errors.proof}
            >
              <FileUpload value={proof} onChange={setProof} invalid={!!errors.proof} />
            </FieldShell>
            <Button onClick={submit} disabled={busy} className="h-11 w-full gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Mengirim…" : `Kirim pesanan naik ke ${choice.label}`}
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
