"use client";

import { useEffect, useMemo, useState } from "react";
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
  Download,
  Maximize2,
  Minimize2,
  Landmark,
  Wallet,
  Home,
  MessageCircle,
} from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { toast } from "@/components/ui/toast";
import { sounds } from "@/lib/sounds";
import { CLASSES } from "@/lib/constants";
import {
  effectiveBasePrice,
  PAYMENT_ACCOUNTS,
  PAYMENT_METHODS,
  CAMPUSES,
  DEVICE_OPTIONS,
  SOURCES,
  WA_ADMIN,
  computeUniqueAmount,
  formatIDR,
  getPackage,
  packageMaxDevices,
  purchasableScopes,
  type PurchasablePackageId,
  type PaymentMethodId,
} from "@/lib/payments";
import { LATEST_SCOPE, scopeKey, scopeFullLabel } from "@/lib/scope";
import { FieldShell } from "./fields/field-shell";
import { Section } from "./fields/section";
import { ShortAnswer } from "./fields/short-answer";
import { Dropdown } from "./fields/dropdown";
import { RadioGroup, type RadioOption } from "./fields/radio-group";
import { CheckboxField } from "./fields/checkbox-group";
import { PackagePicker } from "./fields/package-picker";
import { FileUpload } from "./fields/file-upload";
import { cn } from "@/lib/utils";

// License key is no longer sold. Buyers pick an account: Google, or an email
// they set a password for.
type LoginMethod = "google" | "password";

interface FormState {
  name: string;
  nickname: string;
  classCode: string;
  classOther: string;
  campus: string;
  campusOther: string;
  whatsapp: string;
  loginMethod: LoginMethod;
  loginEmail: string; // Gmail for "google"; any domain for "password"
  loginPassword: string;
  loginPassword2: string;
  pkg: PurchasablePackageId;
  deviceLimit: number;
  shareAck: boolean;
  scopeKey: string;
  paymentMethod: PaymentMethodId | "";
  paymentProof: File | null;
  shareProof: File | null;
  shareProof2: File | null;
  shareMethod: "" | "broadcast" | "story";
  source: string;
  sourceOther: string;
}

const TOTAL_STEPS = 4; // identity, package, payment, review

// Google login requires a Gmail / Googlemail address.
const GMAIL_RE = /@(gmail|googlemail)\.com$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isPackageId(v: string | undefined): v is PurchasablePackageId {
  return v === "share" || v === "normal" || v === "vip" || v === "diamond";
}

// ─── Draft persistence ───
//
// A buyer fills this in while switching to their banking app, and a back button
// or a stray tab close used to wipe the lot. The draft survives that; it is
// cleared only when the purchase is actually submitted.
const DRAFT_KEY = "hs-payments-draft";

/**
 * Fields that go to localStorage.
 *
 * Passwords are NOT here, and must never be. The whole point of hashing at
 * submit and parking it away from the admin's reach is that the plaintext lives
 * nowhere — writing it to localStorage would undo that on the buyer's own
 * machine, where any script on the page can read it.
 *
 * Files aren't here either: a File can't be serialised. The upload boxes come
 * back empty, validation says so, and the buyer re-picks. Better than pretending.
 */
type DraftKey = Exclude<
  keyof FormState,
  "loginPassword" | "loginPassword2" | "paymentProof" | "shareProof" | "shareProof2"
>;

const DRAFT_FIELDS: DraftKey[] = [
  "name",
  "nickname",
  "classCode",
  "classOther",
  "campus",
  "campusOther",
  "whatsapp",
  "loginMethod",
  "loginEmail",
  "pkg",
  "deviceLimit",
  "shareAck",
  "scopeKey",
  "paymentMethod",
  "shareMethod",
  "source",
  "sourceOther",
];

function loadDraft(): Partial<FormState> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    // Copy only the fields we know: a hand-edited or stale draft can't inject
    // keys the form doesn't expect.
    for (const k of DRAFT_FIELDS) {
      if (parsed[k] !== undefined) out[k] = parsed[k];
    }
    return out as Partial<FormState>;
  } catch {
    return null;
  }
}

function saveDraft(form: FormState) {
  try {
    const out: Record<string, unknown> = {};
    for (const k of DRAFT_FIELDS) out[k] = form[k];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(out));
  } catch {
    /* private mode / quota — a lost draft is not worth breaking checkout over */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
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
    nickname: "",
    classCode: "",
    classOther: "",
    campus: "",
    campusOther: "",
    whatsapp: "",
    loginMethod: "google",
    loginEmail: "",
    loginPassword: "",
    loginPassword2: "",
    pkg: isPackageId(initialPkg) ? initialPkg : "normal",
    deviceLimit: 2,
    shareAck: false,
    scopeKey: scopeKey(LATEST_SCOPE),
    paymentMethod: "",
    paymentProof: null,
    shareProof: null,
    shareProof2: null,
    shareMethod: "",
    source: "",
    sourceOther: "",
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Restore the draft after mount. Deliberately not a lazy useState initialiser:
  // localStorage doesn't exist during SSR, and reading it there would render a
  // different tree on the server than on the client.
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setForm((f) => ({
        ...f,
        ...draft,
        // A ?pkg= in the URL is a fresh intent — the buyer just clicked this
        // package on the landing — so it beats whatever the draft remembers.
        pkg: isPackageId(initialPkg) ? initialPkg : (draft.pkg ?? f.pkg),
      }));
    }
    setDraftLoaded(true);
    // initialPkg is fixed for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on every change, but only after the restore has run — otherwise the
  // first render would write the empty form straight over a real draft.
  useEffect(() => {
    if (!draftLoaded || done) return;
    saveDraft(form);
  }, [form, draftLoaded, done]);

  // Clamp the device count down when switching to a package with a lower cap
  // (Share/Normal cap at 2; VIP/Diamond allow 3).
  useEffect(() => {
    setForm((f) => {
      const m = packageMaxDevices(f.pkg);
      return f.deviceLimit > m ? { ...f, deviceLimit: m } : f;
    });
  }, [form.pkg]);

  const isShare = form.pkg === "share";
  const isLE86 = form.classCode === "LE86";
  const resolvedClass = form.classCode === "Other" ? form.classOther.trim() : form.classCode;
  const resolvedCampus = form.campus === "Other" ? form.campusOther.trim() : form.campus;
  // What the server stores: a stable id, not a label.
  const resolvedSource = form.source === "other" ? form.sourceOther.trim() : form.source;
  // What a human reads. Never send this — the label is translated and would
  // land in the database in whatever language the buyer happened to be using.
  const sourceLabel =
    form.source === "other"
      ? form.sourceOther.trim()
      : (() => {
          const hit = SOURCES.find((s) => s.id === form.source);
          return hit ? t(hit.labelKey) : form.source;
        })();
  const maxDevices = packageMaxDevices(form.pkg);
  // 0 = not a share package. Story = 1 proof. Broadcast = LE86 → 2, others → 1.
  const requiredShareProofs = !isShare
    ? 0
    : form.shareMethod === "story"
      ? 1
      : isLE86
        ? 2
        : 1;
  // LE86 + Share = Rp20.000 (flat); else the package list price.
  const price = effectiveBasePrice(form.pkg, resolvedClass);
  const uniqueAmount = useMemo(
    () => computeUniqueAmount(price, form.whatsapp),
    [price, form.whatsapp]
  );
  const selectedScope =
    purchasableScopes().find((s) => scopeKey(s) === form.scopeKey) ?? LATEST_SCOPE;

  // Drop a stale second broadcast proof when it's no longer required
  // (method switched to Story, package changed, or class is no longer LE86).
  useEffect(() => {
    const keepSecond = isShare && form.shareMethod === "broadcast" && isLE86;
    if (!keepSecond) {
      setForm((f) => (f.shareProof2 ? { ...f, shareProof2: null } : f));
    }
  }, [isShare, form.shareMethod, isLE86]);

  const validateStep = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.name.trim()) e.name = t("payments.err_required");
      if (!form.nickname.trim()) e.nickname = t("payments.err_required");
      if (!form.classCode) e.classCode = t("payments.err_required");
      else if (form.classCode === "Other" && !form.classOther.trim())
        e.classOther = t("payments.err_required");
      if (!form.campus) e.campus = t("payments.err_required");
      else if (form.campus === "Other" && !form.campusOther.trim())
        e.campusOther = t("payments.err_required");
      if (form.whatsapp.replace(/\D/g, "").length < 8) e.whatsapp = t("payments.err_whatsapp");
      const le = form.loginEmail.trim();
      if (!le) e.loginEmail = t("payments.err_required");
      else if (form.loginMethod === "google" && !GMAIL_RE.test(le))
        e.loginEmail = t("payments.err_gmail");
      else if (form.loginMethod === "password" && !EMAIL_RE.test(le))
        e.loginEmail = t("payments.err_email");
      if (form.loginMethod === "password") {
        // Mirrors PASSWORD_MIN_LENGTH on the server. The server re-checks —
        // this only saves the buyer a round trip.
        if (form.loginPassword.length < 8) e.loginPassword = t("payments.err_pw_short");
        if (form.loginPassword2 !== form.loginPassword)
          e.loginPassword2 = t("payments.err_pw_mismatch");
      }
    } else if (s === 1) {
      if (isShare && !form.shareAck) e.shareAck = t("payments.err_share_ack");
    } else if (s === 2) {
      if (!form.paymentMethod) e.paymentMethod = t("payments.err_required");
      if (!form.paymentProof) e.paymentProof = t("payments.err_proof");
      if (isShare && !form.shareMethod) e.shareMethod = t("payments.err_share_method");
      if (isShare && form.shareMethod && !form.shareProof) e.shareProof = t("payments.err_proof");
      if (isShare && form.shareMethod === "broadcast" && isLE86 && !form.shareProof2)
        e.shareProof2 = t("payments.err_proof_share2");
      if (!form.source) e.source = t("payments.err_required");
      else if (form.source === "other" && !form.sourceOther.trim())
        e.sourceOther = t("payments.err_required");
    }
    return e;
  };

  const errors = showErrors ? validateStep(step) : {};

  /**
   * Take the buyer to the first thing that's wrong.
   *
   * Marking fields red is useless if the first one is off-screen — you get a
   * toast saying something failed and no idea what. Scroll to it, then shake it
   * so the eye lands on the right control rather than the general area.
   */
  const focusFirstError = (errs: Record<string, string>) => {
    const firstKey = Object.keys(errs)[0];
    if (!firstKey) return;
    // Next frame: the errors have to be rendered before they can be found.
    requestAnimationFrame(() => {
      const el =
        document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`) ??
        document.querySelector<HTMLElement>("[data-field-error='true']");
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("hs-shake");
      // Reading offsetWidth restarts the animation; without it a second failed
      // submit on the same field wouldn't shake at all.
      void el.offsetWidth;
      el.classList.add("hs-shake");
      el.querySelector<HTMLElement>("input, select, textarea, button")?.focus({
        preventScroll: true,
      });
    });
  };

  const goNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) {
      setShowErrors(true);
      sounds.wrong();
      toast.error(t("payments.fix_errors"));
      focusFirstError(e);
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
      focusFirstError(e);
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("name", form.name.trim());
      fd.set("nickname", form.nickname.trim());
      fd.set("whatsapp", form.whatsapp.trim());
      // Contact address = the sign-in address. They were two fields asking for
      // near-identical things; the invoice now lands on the account's own email.
      fd.set("email", form.loginEmail.trim());
      fd.set("loginMethod", form.loginMethod);
      fd.set("loginEmail", form.loginEmail.trim());
      // Not trimmed: a leading/trailing space is a legitimate password character.
      if (form.loginMethod === "password") fd.set("loginPassword", form.loginPassword);
      fd.set("package", form.pkg);
      fd.set("scope", form.scopeKey);
      fd.set("classCode", resolvedClass);
      fd.set("campus", resolvedCampus);
      fd.set("deviceLimit", String(form.deviceLimit));
      fd.set("paymentMethod", form.paymentMethod);
      fd.set("uniqueAmount", String(uniqueAmount));
      fd.set("basePrice", String(price));
      fd.set("source", resolvedSource);
      if (isShare) {
        fd.set("leShareNote", "ack");
        fd.set("shareMethod", form.shareMethod);
      }
      if (form.paymentProof) fd.set("paymentProof", form.paymentProof);
      if (form.shareProof) fd.set("shareProof", form.shareProof);
      if (form.shareProof2) fd.set("shareProof2", form.shareProof2);

      const res = await fetch("/api/payments", { method: "POST", body: fd });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || t("payments.submit_error"));
      }
      sounds.correct();
      // Submitted — the draft has done its job. Anything else (back, refresh,
      // closing the tab) keeps it.
      clearDraft();
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
            href="/"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            {t("payments.success_home")}
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
    <div className="mx-auto flex w-full max-w-xl flex-col px-4 py-6 sm:py-8 lg:max-w-4xl">
      {/* Header */}
      <div className="mb-5 flex w-full items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("payments.back_home")}
        </Link>
        <span className="font-display text-sm font-bold">
          <span className="text-primary">hai</span>study
        </span>
      </div>

      {/* Progress */}
      <div className="mb-6 w-full">
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {step === 0 && (
              // Two sections, not twelve boxes.
              //
              // Every field and every radio option used to carry its own border,
              // so one screen held a dozen outlines and none of them said which
              // field belonged with which. The borders now sit where they mean
              // something — "Data kamu" and "Cara masuk" — and inside a section
              // the radios go plain, leaving only the boxes a buyer can type in.
              //
              // Fields still pair two-up on desktop (Nama|Panggilan,
              // Kelas|WhatsApp) because height is paid in rows, and nothing
              // spans two columns unless it fills them.
              <div className="space-y-4">
                <Section title={t("payments.sec_you")}>
                  <div className="grid gap-y-0 lg:grid-cols-2 lg:gap-x-5">
                    <FieldShell label={t("payments.name_label")} description={t("payments.name_desc")} required error={errors.name} htmlFor="pf-name">
                      <ShortAnswer id="pf-name" value={form.name} onChange={(v) => set("name", v)} placeholder={t("payments.name_ph")} invalid={!!errors.name} autoComplete="name" />
                    </FieldShell>

                    <FieldShell label={t("payments.nickname_label")} description={t("payments.nickname_desc")} required error={errors.nickname} htmlFor="pf-nickname">
                      <ShortAnswer id="pf-nickname" value={form.nickname} onChange={(v) => set("nickname", v)} placeholder={t("payments.nickname_ph")} invalid={!!errors.nickname} autoComplete="nickname" />
                    </FieldShell>

                    <FieldShell label={t("payments.class_label")} description={t("payments.class_desc")} required error={errors.classCode || errors.classOther} htmlFor="pf-class">
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

                    <FieldShell label={t("payments.wa_label")} description={t("payments.wa_desc")} required error={errors.whatsapp} htmlFor="pf-wa">
                      <ShortAnswer id="pf-wa" type="tel" inputMode="tel" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} placeholder="0878xxxxxxxx" invalid={!!errors.whatsapp} autoComplete="tel" />
                    </FieldShell>

                    <div className="lg:col-span-2">
                      <FieldShell label={t("payments.campus_label")} required error={errors.campus || errors.campusOther}>
                        <RadioGroup
                          name="campus"
                          value={form.campus}
                          onChange={(v) => set("campus", v)}
                          variant="plain"
                          columns={4}
                          columnsMobile={2}
                          options={CAMPUSES.map((c) => ({ value: c, label: c === "Other" ? t("payments.opt_other") : c }))}
                        />
                        {form.campus === "Other" && (
                          <div className="mt-2">
                            <ShortAnswer value={form.campusOther} onChange={(v) => set("campusOther", v)} placeholder={t("payments.campus_other_ph")} invalid={!!errors.campusOther} />
                          </div>
                        )}
                      </FieldShell>
                    </div>
                  </div>
                </Section>

                <Section title={t("payments.sec_login")} description={t("payments.login_method_note")}>
                  <div className="grid gap-y-3 lg:grid-cols-2 lg:gap-x-5">
                    <div className="lg:col-span-2">
                      <RadioGroup
                        name="loginMethod"
                        value={form.loginMethod}
                        onChange={(v) => set("loginMethod", v as LoginMethod)}
                        variant="plain"
                        columns={2}
                        options={[
                          { value: "google", label: t("payments.login_google"), description: t("payments.login_google_desc") },
                          { value: "password", label: t("payments.login_password"), description: t("payments.login_password_desc") },
                        ]}
                      />
                    </div>

                    {/* Full width: pairing it with the first password field left
                        "Ulangi password" orphaned beside a hole, and costs the
                        same height either way — so the passwords pair with each
                        other, which is what they are. */}
                    <div className="lg:col-span-2">
                      <FieldShell
                        label={t("payments.login_email_label")}
                        description={
                          form.loginMethod === "google"
                            ? t("payments.login_email_google_desc")
                            : t("payments.login_email_password_desc")
                        }
                        required
                        error={errors.loginEmail}
                        htmlFor="pf-login-email"
                      >
                        <ShortAnswer
                          id="pf-login-email"
                          type="email"
                          inputMode="email"
                          value={form.loginEmail}
                          onChange={(v) => set("loginEmail", v)}
                          placeholder={form.loginMethod === "google" ? "kamu@gmail.com" : "kamu@email.com"}
                          invalid={!!errors.loginEmail}
                          autoComplete="email"
                        />
                      </FieldShell>
                    </div>

                    {form.loginMethod === "password" && (
                      <>
                        <FieldShell
                          label={t("payments.login_pw_label")}
                          description={t("payments.login_pw_desc")}
                          required
                          error={errors.loginPassword}
                          htmlFor="pf-password"
                        >
                          {/* autoComplete="new-password" so the browser offers to
                              generate/save one instead of pasting an existing login. */}
                          <ShortAnswer
                            id="pf-password"
                            type="password"
                            value={form.loginPassword}
                            onChange={(v) => set("loginPassword", v)}
                            placeholder="Minimal 8 karakter"
                            invalid={!!errors.loginPassword}
                            autoComplete="new-password"
                          />
                        </FieldShell>
                        <FieldShell
                          label={t("payments.login_pw2_label")}
                          description={t("payments.login_pw2_desc")}
                          required
                          error={errors.loginPassword2}
                          htmlFor="pf-password2"
                        >
                          <ShortAnswer
                            id="pf-password2"
                            type="password"
                            value={form.loginPassword2}
                            onChange={(v) => set("loginPassword2", v)}
                            placeholder={t("payments.login_pw2_placeholder")}
                            invalid={!!errors.loginPassword2}
                            autoComplete="new-password"
                          />
                        </FieldShell>
                      </>
                    )}
                  </div>
                </Section>
              </div>
            )}

            {step === 1 && (
              // Brought onto the same footing as the other steps: sections, not
              // a bare label over a grid plus an orphan max-w-xl column. This
              // step was the last one still on the old shape, which is why it
              // read as a different page.
              <div className="space-y-4">
                <Section title={t("payments.package_label")}>
                  <PackagePicker value={form.pkg} onChange={(id) => set("pkg", id)} />
                </Section>

                <Section title={t("payments.sec_access")}>
                  <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-x-5">
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
                          disabled: d > maxDevices,
                          disabledHint: d > maxDevices ? t("payments.device_locked_hint") : undefined,
                        }))}
                      />
                      <p className="mt-2 text-[11px] font-medium leading-relaxed text-amber-400">
                        {t("payments.device_share_warn")}
                      </p>
                    </FieldShell>

                    {/* Exam period. Reads as a field like the rest now, instead
                        of a stray bordered box floating under the form. */}
                    <FieldShell label={t("payments.scope_current")}>
                      <div className="rounded-xl border border-border bg-muted/20 p-3">
                        <p className="text-sm font-medium text-foreground">
                          {scopeFullLabel(selectedScope)}
                        </p>
                        {!scopeOpen ? (
                          <button
                            type="button"
                            onClick={() => setScopeOpen(true)}
                            className="mt-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          >
                            {t("payments.scope_switch")}
                          </button>
                        ) : (
                          <div className="mt-2.5">
                            <RadioGroup
                              name="scope"
                              value={form.scopeKey}
                              onChange={(v) => set("scopeKey", v)}
                              variant="plain"
                              options={purchasableScopes().map((s) => ({
                                value: scopeKey(s),
                                label: scopeFullLabel(s),
                              }))}
                            />
                          </div>
                        )}
                      </div>
                    </FieldShell>
                  </div>
                </Section>

                {isShare && (
                  <Section title={t("payments.share_ack_label")}>
                    <FieldShell label={t("payments.share_ack_check")} error={errors.shareAck}>
                      <CheckboxField
                        checked={form.shareAck}
                        onChange={(v) => set("shareAck", v)}
                        label={t("payments.share_ack_check")}
                        description={t("payments.share_ack_desc")}
                        invalid={!!errors.shareAck}
                      />
                      {isLE86 && (
                        <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-300">
                          {t("payments.share_le86_note")}
                        </p>
                      )}
                    </FieldShell>
                  </Section>
                )}
              </div>
            )}

            {step === 2 && (
              // Two columns, split by what the buyer DOES with each half.
              //
              // Left is reference: the amount and the accounts — you read it,
              // copy from it, and switch to your banking app. Right is the form:
              // method, proof, source. As one long column these interleaved, so
              // you scrolled past the account number to find the upload, then
              // scrolled back for the number. Widening the column did nothing
              // for that; only splitting the two jobs does.
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-x-5">
                {/* ── LEFT: what to pay, and where ── */}
                <Section title={t("payments.sec_pay")}>
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 text-center">
                    <p className="text-[11px] text-muted-foreground">{t("payments.amount_label")}</p>
                    <button
                      type="button"
                      onClick={() => copy(String(uniqueAmount))}
                      className="mt-0.5 inline-flex items-center gap-2 font-display text-3xl font-bold text-foreground"
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

                  <div className="mt-3 space-y-2">
                    <AccountRow icon={<Landmark className="h-4 w-4" />} label={PAYMENT_ACCOUNTS.bca.label} number={PAYMENT_ACCOUNTS.bca.number} holder={PAYMENT_ACCOUNTS.bca.holder} onCopy={() => copy(PAYMENT_ACCOUNTS.bca.number)} hint={t("payments.tap_to_copy")} />
                    <AccountRow icon={<Wallet className="h-4 w-4" />} label={PAYMENT_ACCOUNTS.ewallet.label} number={PAYMENT_ACCOUNTS.ewallet.number} holder={PAYMENT_ACCOUNTS.ewallet.holder} onCopy={() => copy(PAYMENT_ACCOUNTS.ewallet.number)} hint={t("payments.tap_to_copy")} />
                    <QrisCard
                      label={t("payments.qris_label")}
                      expandHint={t("payments.qris_expand")}
                      downloadLabel={t("payments.qris_download")}
                    />
                  </div>
                </Section>

                {/* ── RIGHT: prove it ── */}
                <Section title={t("payments.sec_confirm")}>
                  <div className="space-y-4">
                    <FieldShell label={t("payments.method_label")} required error={errors.paymentMethod}>
                      <RadioGroup
                        name="method"
                        variant="tile"
                        value={form.paymentMethod}
                        onChange={(v) => set("paymentMethod", v as PaymentMethodId)}
                        columns={3}
                        options={PAYMENT_METHODS.map((m) => ({ value: m.id, label: t(m.labelKey) }))}
                      />
                    </FieldShell>

                    <FieldShell label={t("payments.proof_pay_label")} description={t("payments.proof_pay_desc")} required error={errors.paymentProof}>
                      <FileUpload value={form.paymentProof} onChange={(f) => set("paymentProof", f)} invalid={!!errors.paymentProof} />
                    </FieldShell>

                    <FieldShell label={t("payments.source_label")} required error={errors.source || errors.sourceOther}>
                      <RadioGroup
                        name="source"
                        value={form.source}
                        onChange={(v) => set("source", v)}
                        variant="plain"
                        columns={2}
                        columnsMobile={2}
                        options={SOURCES.map((s) => ({ value: s.id, label: t(s.labelKey) })) as RadioOption[]}
                      />
                      {form.source === "other" && (
                        <div className="mt-2">
                          <ShortAnswer value={form.sourceOther} onChange={(v) => set("sourceOther", v)} placeholder={t("payments.source_other_ph")} invalid={!!errors.sourceOther} />
                        </div>
                      )}
                    </FieldShell>
                  </div>
                </Section>

                {/* ── Share-only, full width: it is its own errand, and only a
                       quarter of buyers ever see it. ── */}
                {isShare && (
                  <div className="lg:col-span-2">
                    <Section title={t("payments.sec_share")} description={t("payments.share_method_desc")}>
                      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-x-5">
                        <FieldShell label={t("payments.share_method_label")} required error={errors.shareMethod}>
                          <RadioGroup
                            name="shareMethod"
                            value={form.shareMethod}
                            onChange={(v) => set("shareMethod", v as FormState["shareMethod"])}
                            variant="plain"
                            columns={1}
                            options={[
                              {
                                value: "broadcast",
                                label: t("payments.share_method_broadcast"),
                                description: isLE86
                                  ? t("payments.share_method_broadcast_desc_le86")
                                  : t("payments.share_method_broadcast_desc"),
                              },
                              {
                                value: "story",
                                label: t("payments.share_method_story"),
                                description: t("payments.share_method_story_desc"),
                              },
                            ]}
                          />
                        </FieldShell>

                        {form.shareMethod && (
                          <FieldShell
                            label={
                              form.shareMethod === "story"
                                ? t("payments.proof_story_label")
                                : requiredShareProofs === 2
                                  ? t("payments.proof_broadcast1_label")
                                  : t("payments.proof_broadcast_label")
                            }
                            description={
                              form.shareMethod === "story"
                                ? t("payments.proof_story_desc")
                                : requiredShareProofs === 2
                                  ? t("payments.proof_broadcast1_desc")
                                  : t("payments.proof_broadcast_desc")
                            }
                            required
                            error={errors.shareProof}
                          >
                            <FileUpload value={form.shareProof} onChange={(f) => set("shareProof", f)} invalid={!!errors.shareProof} />
                          </FieldShell>
                        )}

                        {form.shareMethod === "broadcast" && isLE86 && (
                          <FieldShell
                            label={t("payments.proof_broadcast2_label")}
                            description={t("payments.proof_broadcast2_desc")}
                            required
                            error={errors.shareProof2}
                          >
                            <FileUpload value={form.shareProof2} onChange={(f) => set("shareProof2", f)} invalid={!!errors.shareProof2} />
                          </FieldShell>
                        )}
                      </div>
                    </Section>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              // Two columns on desktop. Identity and Package are short, so they
              // stack on the left; Payment is the long one and gets its own.
              <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-x-5">
                <div className="space-y-4">
                <ReviewSection title={t("payments.step_identity")} onEdit={() => jumpTo(0)} editLabel={t("common.edit")}>
                  <ReviewRow label={t("payments.name_label")} value={form.name} />
                  <ReviewRow label={t("payments.class_label")} value={resolvedClass} />
                  <ReviewRow label={t("payments.campus_label")} value={resolvedCampus} />
                  <ReviewRow label={t("payments.wa_label")} value={form.whatsapp} />
                  <ReviewRow
                    label={t("payments.login_method_label")}
                    value={form.loginMethod === "google" ? t("payments.login_google") : t("payments.login_password")}
                  />
                  {(
                    <ReviewRow label={t("payments.login_email_label")} value={form.loginEmail} />
                  )}
                </ReviewSection>

                <ReviewSection title={t("payments.step_package")} onEdit={() => jumpTo(1)} editLabel={t("common.edit")}>
                  <ReviewRow label={t("payments.package_label")} value={t(getPackage(form.pkg)?.nameKey ?? "")} />
                  <ReviewRow label={t("payments.device_label")} value={`${form.deviceLimit} ${t("payments.device_unit")}`} />
                  <ReviewRow label={t("payments.scope_current")} value={scopeFullLabel(selectedScope)} />
                </ReviewSection>
                </div>

                <ReviewSection title={t("payments.step_payment")} onEdit={() => jumpTo(2)} editLabel={t("common.edit")}>
                  <ReviewRow label={t("payments.amount_label")} value={formatIDR(uniqueAmount)} highlight />
                  <ReviewRow label={t("payments.method_label")} value={t(PAYMENT_METHODS.find((m) => m.id === form.paymentMethod)?.labelKey ?? "")} />
                  <ReviewRow label={t("payments.proof_pay_label")} value={form.paymentProof ? "✓" : "—"} />
                  {isShare && (
                    <ReviewRow
                      label={t("payments.review_share_method")}
                      value={form.shareMethod === "story" ? t("payments.share_method_story") : t("payments.share_method_broadcast")}
                    />
                  )}
                  {isShare && <ReviewRow label={t("payments.proof_share_label")} value={form.shareProof ? "✓" : "—"} />}
                  {isShare && form.shareMethod === "broadcast" && isLE86 && (
                    <ReviewRow label={t("payments.proof_broadcast2_label")} value={form.shareProof2 ? "✓" : "—"} />
                  )}
                  <ReviewRow label={t("payments.source_label")} value={sourceLabel} />
                </ReviewSection>

                <p className="px-1 text-[11px] leading-relaxed text-muted-foreground lg:col-span-2">
                  {t("payments.review_note")}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="mx-auto mt-7 flex w-full max-w-xl gap-2.5">
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

/**
 * QRIS row. No thumbnail: a 64px crop of a QR is unscannable and unreadable, so
 * it was decoration that cost a fetch. The two things a buyer actually does are
 * explicit instead — save it to scan from another device (labelled, because it
 * is the primary action), or open it inline to scan right here (icon only).
 */
function QrisCard({
  label,
  expandHint,
  downloadLabel,
}: {
  label: string;
  expandHint: string;
  downloadLabel: string;
}) {
  const [broken, setBroken] = useState(false);
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/*
        The whole row toggles, so the target is the size of the row rather than a
        24px icon. `Simpan` sits inside it and stops propagation — otherwise
        saving the image would also expand the panel you were trying to avoid.
      */}
      <div
        role={broken ? undefined : "button"}
        tabIndex={broken ? undefined : 0}
        aria-expanded={broken ? undefined : expanded}
        onClick={() => !broken && setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (broken) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className={cn(
          "flex items-center gap-3 px-3.5 py-3 transition-colors",
          !broken && "cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60"
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <QrCode className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">QRIS</p>
          <p className="text-[11px] text-muted-foreground">{broken ? label : expandHint}</p>
        </div>

        {!broken && (
          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href={PAYMENT_ACCOUNTS.qrisImage}
              download="qris-haistudy.jpg"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Download className="h-3.5 w-3.5" />
              {downloadLabel}
            </a>
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground"
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </span>
          </div>
        )}
      </div>

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
                alt="QRIS haistudy, scan untuk bayar"
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
    <Section
      title={title}
      action={
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Pencil className="h-3 w-3" />
          {editLabel}
        </button>
      }
    >
      <dl className="space-y-2">{children}</dl>
    </Section>
  );
}

/**
 * One reviewed value.
 *
 * Was label-left / value-right across the full card. That reads fine at 576px
 * and badly at 896px: the eye has to cross an empty gulf to pair a label with
 * its answer, and the wider the card the worse it gets. A fixed label column
 * with the value right beside it keeps the pair together at any width.
 */
function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] items-start gap-3 text-sm">
      <dt className="truncate text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words",
          highlight ? "font-display font-bold text-primary" : "font-medium text-foreground"
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}
