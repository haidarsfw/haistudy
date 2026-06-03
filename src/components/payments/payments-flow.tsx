"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Pencil,
  QrCode,
  Landmark,
  Wallet,
  GraduationCap,
  MessageCircle,
} from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { toast } from "@/components/ui/toast";
import { sounds } from "@/lib/sounds";
import { CLASSES } from "@/lib/constants";
import {
  PACKAGE_PRICES,
  PAYMENT_ACCOUNTS,
  PAYMENT_METHODS,
  CAMPUSES,
  DEVICE_OPTIONS,
  SOURCES,
  WA_ADMIN,
  computeUniqueAmount,
  formatIDR,
  getPackage,
  purchasableScopes,
  type PurchasablePackageId,
  type PaymentMethodId,
} from "@/lib/payments";
import { DEFAULT_SCOPE, scopeKey, scopeFullLabel } from "@/lib/scope";
import { FieldShell } from "./fields/field-shell";
import { ShortAnswer } from "./fields/short-answer";
import { Dropdown } from "./fields/dropdown";
import { RadioGroup, type RadioOption } from "./fields/radio-group";
import { CheckboxField } from "./fields/checkbox-group";
import { PackagePicker } from "./fields/package-picker";
import { FileUpload } from "./fields/file-upload";

type LoginMethod = "key" | "email";

interface FormState {
  name: string;
  classCode: string;
  classOther: string;
  campus: string;
  campusOther: string;
  whatsapp: string;
  email: string; // contact email (any domain) — notif & key reset
  loginMethod: LoginMethod;
  loginEmail: string; // Gmail used for Google login (when loginMethod === "email")
  pkg: PurchasablePackageId;
  deviceLimit: number;
  shareAck: boolean;
  scopeKey: string;
  paymentMethod: PaymentMethodId | "";
  paymentProof: File | null;
  shareProof: File | null;
  source: string;
  sourceOther: string;
}

const TOTAL_STEPS = 4; // identity, package, payment, review

// Google login requires a Gmail / Googlemail address.
const GMAIL_RE = /@(gmail|googlemail)\.com$/i;

function isPackageId(v: string | undefined): v is PurchasablePackageId {
  return v === "share" || v === "normal" || v === "vip" || v === "diamond";
}

export function PaymentsFlow({ initialPkg }: { initialPkg?: string }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    classCode: "",
    classOther: "",
    campus: "",
    campusOther: "",
    whatsapp: "",
    email: "",
    loginMethod: "key",
    loginEmail: "",
    pkg: isPackageId(initialPkg) ? initialPkg : "normal",
    deviceLimit: 2,
    shareAck: false,
    scopeKey: scopeKey(DEFAULT_SCOPE),
    paymentMethod: "",
    paymentProof: null,
    shareProof: null,
    source: "",
    sourceOther: "",
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isShare = form.pkg === "share";
  const price = PACKAGE_PRICES[form.pkg];
  const uniqueAmount = useMemo(
    () => computeUniqueAmount(price, form.whatsapp),
    [price, form.whatsapp]
  );
  const resolvedClass = form.classCode === "Other" ? form.classOther.trim() : form.classCode;
  const resolvedCampus = form.campus === "Other" ? form.campusOther.trim() : form.campus;
  const resolvedSource = form.source === "other" ? form.sourceOther.trim() : form.source;
  const selectedScope =
    purchasableScopes().find((s) => scopeKey(s) === form.scopeKey) ?? DEFAULT_SCOPE;

  const validateStep = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.name.trim()) e.name = t("payments.err_required");
      if (!form.classCode) e.classCode = t("payments.err_required");
      else if (form.classCode === "Other" && !form.classOther.trim())
        e.classOther = t("payments.err_required");
      if (!form.campus) e.campus = t("payments.err_required");
      else if (form.campus === "Other" && !form.campusOther.trim())
        e.campusOther = t("payments.err_required");
      if (form.whatsapp.replace(/\D/g, "").length < 8) e.whatsapp = t("payments.err_whatsapp");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) e.email = t("payments.err_email");
      if (form.loginMethod === "email") {
        const le = form.loginEmail.trim();
        if (!le) e.loginEmail = t("payments.err_required");
        else if (!GMAIL_RE.test(le)) e.loginEmail = t("payments.err_gmail");
      }
    } else if (s === 1) {
      if (isShare && !form.shareAck) e.shareAck = t("payments.err_share_ack");
    } else if (s === 2) {
      if (!form.paymentMethod) e.paymentMethod = t("payments.err_required");
      if (!form.paymentProof) e.paymentProof = t("payments.err_proof");
      if (isShare && !form.shareProof) e.shareProof = t("payments.err_proof");
      if (!form.source) e.source = t("payments.err_required");
      else if (form.source === "other" && !form.sourceOther.trim())
        e.sourceOther = t("payments.err_required");
    }
    return e;
  };

  const errors = showErrors ? validateStep(step) : {};

  const goNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) {
      setShowErrors(true);
      sounds.wrong();
      toast.error(t("payments.fix_errors"));
      return;
    }
    sounds.click();
    setShowErrors(false);
    setDir(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    sounds.click();
    setShowErrors(false);
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const jumpTo = (s: number) => {
    setShowErrors(false);
    setDir(s < step ? -1 : 1);
    setStep(s);
  };

  const copy = (txt: string) => {
    navigator.clipboard?.writeText(txt).then(
      () => toast.success(t("payments.copied")),
      () => {}
    );
  };

  const submit = async () => {
    const e = validateStep(2);
    if (Object.keys(e).length) {
      setDir(-1);
      setStep(2);
      setShowErrors(true);
      toast.error(t("payments.fix_errors"));
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("name", form.name.trim());
      fd.set("whatsapp", form.whatsapp.trim());
      fd.set("email", form.email.trim());
      fd.set("loginMethod", form.loginMethod);
      if (form.loginMethod === "email") fd.set("loginEmail", form.loginEmail.trim());
      fd.set("package", form.pkg);
      fd.set("scope", form.scopeKey);
      fd.set("classCode", resolvedClass);
      fd.set("campus", resolvedCampus);
      fd.set("deviceLimit", String(form.deviceLimit));
      fd.set("paymentMethod", form.paymentMethod);
      fd.set("uniqueAmount", String(uniqueAmount));
      fd.set("basePrice", String(price));
      fd.set("source", resolvedSource);
      if (isShare) fd.set("leShareNote", "ack");
      if (form.paymentProof) fd.set("paymentProof", form.paymentProof);
      if (form.shareProof) fd.set("shareProof", form.shareProof);

      const res = await fetch("/api/payments", { method: "POST", body: fd });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || t("payments.submit_error"));
      }
      sounds.correct();
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("payments.submit_error"));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success screen ───
  if (done) {
    const waText = encodeURIComponent(
      `Halo Admin haistudy, saya sudah menyelesaikan pembelian.\n\n` +
        `Nama: ${form.name}\n` +
        `Paket: ${t(getPackage(form.pkg)?.nameKey ?? "")}\n` +
        `Nominal: ${formatIDR(uniqueAmount)}\n` +
        `Periode: ${scopeFullLabel(selectedScope)}\n\n` +
        `Mohon bantu konfirmasi pembayaran saya. Terima kasih.`
    );
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
        >
          <CheckCircle2 className="h-11 w-11 text-primary" />
        </motion.div>
        <h1 className="font-heading text-2xl font-bold">{t("payments.success_title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("payments.success_desc")}
        </p>
        <div className="mt-5 w-full rounded-xl border border-primary/20 bg-primary/5 p-3 text-left">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("payments.success_policy")}
          </p>
        </div>
        <div className="mt-6 flex w-full flex-col gap-2.5">
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            <GraduationCap className="h-4 w-4" />
            {t("payments.success_login")}
          </Link>
          <a
            href={`https://api.whatsapp.com/send?phone=${WA_ADMIN}&text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t("payments.success_wa")}
          </a>
        </div>
      </div>
    );
  }

  const stepTitles = [
    t("payments.step_identity"),
    t("payments.step_package"),
    t("payments.step_payment"),
    t("payments.step_review"),
  ];

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("payments.back_home")}
        </Link>
        <span className="font-heading text-sm font-bold">
          <span className="text-primary">hai</span>study
        </span>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          {t("payments.step_counter")
            .replace("{n}", String(step + 1))
            .replace("{total}", String(TOTAL_STEPS))}{" "}
          · {stepTitles[step]}
        </p>
      </div>

      {/* Animated step body */}
      <div className="flex-1">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -28 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="space-y-5"
          >
            {step === 0 && (
              <>
                <FieldShell label={t("payments.name_label")} description={t("payments.name_desc")} required error={errors.name} htmlFor="pf-name">
                  <ShortAnswer id="pf-name" value={form.name} onChange={(v) => set("name", v)} placeholder={t("payments.name_ph")} invalid={!!errors.name} autoComplete="name" />
                </FieldShell>

                <FieldShell label={t("payments.class_label")} required error={errors.classCode || errors.classOther} htmlFor="pf-class">
                  <Dropdown
                    id="pf-class"
                    value={form.classCode}
                    onChange={(v) => set("classCode", v)}
                    placeholder={t("payments.class_ph")}
                    invalid={!!errors.classCode}
                    options={CLASSES.map((c) => ({ value: c, label: c === "Other" ? t("payments.opt_other") : c }))}
                  />
                  {form.classCode === "Other" && (
                    <div className="mt-2">
                      <ShortAnswer value={form.classOther} onChange={(v) => set("classOther", v)} placeholder={t("payments.class_other_ph")} invalid={!!errors.classOther} />
                    </div>
                  )}
                </FieldShell>

                <FieldShell label={t("payments.campus_label")} required error={errors.campus || errors.campusOther}>
                  <RadioGroup
                    name="campus"
                    value={form.campus}
                    onChange={(v) => set("campus", v)}
                    columns={2}
                    options={CAMPUSES.map((c) => ({ value: c, label: c === "Other" ? t("payments.opt_other") : c }))}
                  />
                  {form.campus === "Other" && (
                    <div className="mt-2">
                      <ShortAnswer value={form.campusOther} onChange={(v) => set("campusOther", v)} placeholder={t("payments.campus_other_ph")} invalid={!!errors.campusOther} />
                    </div>
                  )}
                </FieldShell>

                <FieldShell label={t("payments.wa_label")} description={t("payments.wa_desc")} required error={errors.whatsapp} htmlFor="pf-wa">
                  <ShortAnswer id="pf-wa" type="tel" inputMode="tel" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} placeholder="0878xxxxxxxx" invalid={!!errors.whatsapp} autoComplete="tel" />
                </FieldShell>

                <FieldShell label={t("payments.email_label")} description={t("payments.email_desc")} required error={errors.email} htmlFor="pf-email">
                  <ShortAnswer id="pf-email" type="email" inputMode="email" value={form.email} onChange={(v) => set("email", v)} placeholder="kamu@email.com" invalid={!!errors.email} autoComplete="email" />
                </FieldShell>

                <FieldShell label={t("payments.login_method_label")} description={t("payments.login_method_note")} required>
                  <RadioGroup
                    name="loginMethod"
                    value={form.loginMethod}
                    onChange={(v) => set("loginMethod", v as LoginMethod)}
                    columns={2}
                    options={[
                      { value: "key", label: t("payments.login_key"), description: t("payments.login_key_desc") },
                      { value: "email", label: t("payments.login_email"), description: t("payments.login_email_desc") },
                    ]}
                  />
                </FieldShell>

                {form.loginMethod === "email" && (
                  <FieldShell label={t("payments.login_email_label")} description={t("payments.login_email_field_desc")} required error={errors.loginEmail} htmlFor="pf-gmail">
                    <ShortAnswer id="pf-gmail" type="email" inputMode="email" value={form.loginEmail} onChange={(v) => set("loginEmail", v)} placeholder="kamu@gmail.com" invalid={!!errors.loginEmail} autoComplete="email" />
                  </FieldShell>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <FieldShell label={t("payments.package_label")} required>
                  <PackagePicker value={form.pkg} onChange={(id) => set("pkg", id)} />
                </FieldShell>

                <FieldShell label={t("payments.device_label")} description={t("payments.device_desc")} required error={errors.deviceLimit}>
                  <RadioGroup
                    name="device"
                    variant="tile"
                    value={String(form.deviceLimit)}
                    onChange={(v) => set("deviceLimit", parseInt(v, 10))}
                    columns={3}
                    options={DEVICE_OPTIONS.map((d) => ({
                      value: String(d),
                      label: `${d} ${t("payments.device_unit")}`,
                    }))}
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {t("payments.device_3_note")}
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-600 dark:text-amber-400">
                    {t("payments.device_share_warn")}
                  </p>
                </FieldShell>

                {isShare && (
                  <FieldShell label={t("payments.share_ack_label")} required error={errors.shareAck}>
                    <CheckboxField
                      checked={form.shareAck}
                      onChange={(v) => set("shareAck", v)}
                      label={t("payments.share_ack_check")}
                      description={t("payments.share_ack_desc")}
                      invalid={!!errors.shareAck}
                    />
                  </FieldShell>
                )}

                {/* Scope (exam period) */}
                <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                  <p className="text-xs text-muted-foreground">{t("payments.scope_current")}</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{scopeFullLabel(selectedScope)}</p>
                  {!scopeOpen ? (
                    <button
                      type="button"
                      onClick={() => setScopeOpen(true)}
                      className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      {t("payments.scope_switch")}
                    </button>
                  ) : (
                    <div className="mt-3">
                      <RadioGroup
                        name="scope"
                        value={form.scopeKey}
                        onChange={(v) => set("scopeKey", v)}
                        options={purchasableScopes().map((s) => ({
                          value: scopeKey(s),
                          label: scopeFullLabel(s),
                        }))}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {/* Amount to pay */}
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
                  <p className="text-xs text-muted-foreground">{t("payments.amount_label")}</p>
                  <button
                    type="button"
                    onClick={() => copy(String(uniqueAmount))}
                    className="mt-1 inline-flex items-center gap-2 text-3xl font-bold text-foreground"
                  >
                    {formatIDR(uniqueAmount)}
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    {t("payments.amount_unique_hint")
                      .replace("{base}", formatIDR(price))
                      .replace("{digits}", uniqueAmount === price ? "000" : String(uniqueAmount - price).padStart(3, "0"))}
                  </p>
                </div>

                {/* Accounts */}
                <div className="space-y-2">
                  <AccountRow icon={<Landmark className="h-4 w-4" />} label={PAYMENT_ACCOUNTS.bca.label} number={PAYMENT_ACCOUNTS.bca.number} holder={PAYMENT_ACCOUNTS.bca.holder} onCopy={() => copy(PAYMENT_ACCOUNTS.bca.number)} hint={t("payments.tap_to_copy")} />
                  <AccountRow icon={<Wallet className="h-4 w-4" />} label={PAYMENT_ACCOUNTS.ewallet.label} number={PAYMENT_ACCOUNTS.ewallet.number} holder={PAYMENT_ACCOUNTS.ewallet.holder} onCopy={() => copy(PAYMENT_ACCOUNTS.ewallet.number)} hint={t("payments.tap_to_copy")} />
                  <QrisCard label={t("payments.qris_label")} expandHint={t("payments.qris_expand")} />
                </div>

                <FieldShell label={t("payments.method_label")} required error={errors.paymentMethod}>
                  <RadioGroup
                    name="method"
                    value={form.paymentMethod}
                    onChange={(v) => set("paymentMethod", v as PaymentMethodId)}
                    columns={3}
                    options={PAYMENT_METHODS.map((m) => ({ value: m.id, label: t(m.labelKey) }))}
                  />
                </FieldShell>

                <FieldShell label={t("payments.proof_pay_label")} description={t("payments.proof_pay_desc")} required error={errors.paymentProof}>
                  <FileUpload value={form.paymentProof} onChange={(f) => set("paymentProof", f)} invalid={!!errors.paymentProof} />
                </FieldShell>

                {isShare && (
                  <FieldShell label={t("payments.proof_share_label")} description={t("payments.proof_share_desc")} required error={errors.shareProof}>
                    <FileUpload value={form.shareProof} onChange={(f) => set("shareProof", f)} invalid={!!errors.shareProof} />
                  </FieldShell>
                )}

                <FieldShell label={t("payments.source_label")} required error={errors.source || errors.sourceOther}>
                  <RadioGroup
                    name="source"
                    value={form.source}
                    onChange={(v) => set("source", v)}
                    columns={2}
                    options={SOURCES.map((s) => ({ value: s.id, label: t(s.labelKey) })) as RadioOption[]}
                  />
                  {form.source === "other" && (
                    <div className="mt-2">
                      <ShortAnswer value={form.sourceOther} onChange={(v) => set("sourceOther", v)} placeholder={t("payments.source_other_ph")} invalid={!!errors.sourceOther} />
                    </div>
                  )}
                </FieldShell>
              </>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <ReviewSection title={t("payments.step_identity")} onEdit={() => jumpTo(0)} editLabel={t("common.edit")}>
                  <ReviewRow label={t("payments.name_label")} value={form.name} />
                  <ReviewRow label={t("payments.class_label")} value={resolvedClass} />
                  <ReviewRow label={t("payments.campus_label")} value={resolvedCampus} />
                  <ReviewRow label={t("payments.wa_label")} value={form.whatsapp} />
                  <ReviewRow label={t("payments.email_label")} value={form.email} />
                  <ReviewRow
                    label={t("payments.login_method_label")}
                    value={form.loginMethod === "email" ? t("payments.login_email") : t("payments.login_key")}
                  />
                  {form.loginMethod === "email" && (
                    <ReviewRow label={t("payments.login_email_label")} value={form.loginEmail} />
                  )}
                </ReviewSection>

                <ReviewSection title={t("payments.step_package")} onEdit={() => jumpTo(1)} editLabel={t("common.edit")}>
                  <ReviewRow label={t("payments.package_label")} value={t(getPackage(form.pkg)?.nameKey ?? "")} />
                  <ReviewRow label={t("payments.device_label")} value={`${form.deviceLimit} ${t("payments.device_unit")}`} />
                  <ReviewRow label={t("payments.scope_current")} value={scopeFullLabel(selectedScope)} />
                </ReviewSection>

                <ReviewSection title={t("payments.step_payment")} onEdit={() => jumpTo(2)} editLabel={t("common.edit")}>
                  <ReviewRow label={t("payments.amount_label")} value={formatIDR(uniqueAmount)} highlight />
                  <ReviewRow label={t("payments.method_label")} value={t(PAYMENT_METHODS.find((m) => m.id === form.paymentMethod)?.labelKey ?? "")} />
                  <ReviewRow label={t("payments.proof_pay_label")} value={form.paymentProof ? "✓" : "—"} />
                  {isShare && <ReviewRow label={t("payments.proof_share_label")} value={form.shareProof ? "✓" : "—"} />}
                  <ReviewRow label={t("payments.source_label")} value={resolvedSource} />
                </ReviewSection>

                <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                  {t("payments.review_note")}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="mt-7 flex gap-2.5">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("payments.back")}
          </button>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("payments.next")}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("payments.submit")}
          </button>
        )}
      </div>
    </div>
  );
}

function AccountRow({
  icon,
  label,
  number,
  holder,
  onCopy,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  number: string;
  holder: string;
  onCopy: () => void;
  hint: string;
}) {
  // Whole row is the copy target — tap anywhere to copy the number.
  return (
    <button
      type="button"
      onClick={onCopy}
      title={hint}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm font-semibold text-foreground">{number}</p>
        <p className="truncate text-[11px] text-muted-foreground">a.n. {holder}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground transition-colors group-hover:text-foreground">
        <Copy className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{hint}</span>
      </span>
    </button>
  );
}

function QrisCard({ label, expandHint }: { label: string; expandHint: string }) {
  const [broken, setBroken] = useState(false);
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => !broken && setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <QrCode className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">QRIS</p>
          <p className="text-[11px] text-muted-foreground">{broken ? label : expandHint}</p>
        </div>
        {!broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={PAYMENT_ACCOUNTS.qrisImage}
            alt="QRIS"
            onError={() => setBroken(true)}
            className="h-16 w-16 shrink-0 rounded-lg border border-border object-contain"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-[9px] text-muted-foreground">
            QRIS
          </div>
        )}
      </button>
      <AnimatePresence initial={false}>
        {expanded && !broken && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex justify-center border-t border-border p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PAYMENT_ACCOUNTS.qrisImage}
                alt="QRIS — scan untuk bayar"
                onError={() => setBroken(true)}
                className="w-full max-w-[18rem] rounded-lg border border-border object-contain"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  editLabel,
  children,
}: {
  title: string;
  onEdit: () => void;
  editLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Pencil className="h-3 w-3" />
          {editLabel}
        </button>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={`min-w-0 break-words text-right ${highlight ? "font-bold text-primary" : "font-medium text-foreground"}`}>
        {value || "—"}
      </span>
    </div>
  );
}
