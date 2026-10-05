"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Pencil,
  Landmark,
  Wallet,
  Home,
  MessageCircle,
} from "@/components/ui/icons";
import { useTranslation } from "@/components/providers/language-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { AccountRow, QrisCard } from "@/components/payments/pay-to";
import { sounds } from "@/lib/sounds";
import {
  effectiveBasePrice,
  PAYMENT_ACCOUNTS,
  PAYMENT_METHODS,
  DEVICE_OPTIONS,
  SOURCES,
  WA_ADMIN,
  computeUniqueAmount,
  formatIDR,
  getPackage,
  packageMaxDevices,
  purchasableScopes,
  offeredScopes,
  type PurchasablePackageId,
  type PaymentMethodId,
} from "@/lib/payments";
import {
  angkatanForCampus,
  CAMPUS_OPTIONS,
  CLASSES_BY_LOCATION,
  JURUSAN_LABELS,
  OTHER_LOCATION,
  campusForLocation,
  defaultScopeForAngkatan,
  normalizeClassCode,
} from "@/data/landing/campus";
import {
  LATEST_SCOPE,
  scopeKey,
  scopeFullLabel,
  isPurchasableScope,
  parseScopeKey,
} from "@/lib/scope";
import {
  pickBestDiscount,
  type DiscountOption,
} from "@/lib/referral/discount-pricing";
import {
  classDiscountOption,
  isPromoClass,
  type ClassPromo,
} from "@/lib/referral/class-discount";
import { directionalPanel, NAV } from "@/lib/motion";
import { WelcomeStrip } from "@/components/account/welcome-strip";
import {
  NicknameAdornment,
  NicknameHint,
  useNicknameCheck,
} from "@/components/account/nickname-status";
import {
  NICKNAME_MAX,
  normalizeNickname,
  validateNickname,
} from "@/lib/account/nickname";
import {
  VerifyEmailBox,
  VerifyEmailInline,
} from "@/components/account/verify-email-notice";
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
/**
 * Who is buying, taken from the signed-in account.
 *
 * Checkout no longer asks how you want to sign in or invents a login for you:
 * you are already signed in by the time you get here, and the access lands on
 * the account you are using. A field that is already on the account is shown,
 * not asked for; anything still blank is asked once here and saved back, so
 * the next purchase asks nothing at all.
 */
// Re-exported, not re-declared. A second hand-written copy of this shape is how
// the `percent` field would have gone missing on the screen that has to honour
// it. The pricing rule lives beside it, in ./discount-pricing.
export type { DiscountOption };

export interface BuyerAccount {
  email: string;
  /**
   * Blocks nothing here. It decides whether the order can be APPROVED later,
   * which is why the buyer is told before they pay rather than after.
   */
  emailVerified: boolean;
  authProvider: "google" | "password";
  fullName: string;
  nickname: string;
  whatsapp: string;
  campus: string;
  angkatan: string;
  classCode: string;
}

interface FormState {
  name: string;
  nickname: string;
  classCode: string;
  classOther: string;
  /** BINUS or UNJ. `campus` below is the LOCATION, which is a different thing. */
  university: string;
  /** Scope jurusan code, e.g. "bm". */
  jurusan: string;
  campus: string;
  campusOther: string;
  angkatan: string;
  whatsapp: string;
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
 * No credentials live here any more — checkout stopped creating logins the
 * moment accounts existed, so there is nothing sensitive left to leak onto the
 * buyer's own machine.
 *
 * Files aren't here either: a File can't be serialised. The upload boxes come
 * back empty, validation says so, and the buyer re-picks. Better than pretending.
 */
type DraftKey = Exclude<
  keyof FormState,
  "paymentProof" | "shareProof" | "shareProof2"
>;

const DRAFT_FIELDS: DraftKey[] = [
  "name",
  "nickname",
  "classCode",
  "classOther",
  "university",
  "jurusan",
  "campus",
  "campusOther",
  "angkatan",
  "whatsapp",
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

/** A value the account already holds: shown, not asked for. */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    // `min-w-0` on the ROW, not only on the value. These rows sit in a grid,
    // and a grid item defaults to `min-width: auto` — it refuses to shrink
    // below its content. A 112px label plus an unbreakable address made the
    // row 330px wide inside a 320px phone, and the whole checkout page could
    // be dragged sideways by 43px. The `truncate` on the value was already
    // there and could not help while its parent would not narrow.
    <div className="flex min-w-0 items-baseline gap-3">
      <dt className="w-28 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function PaymentsFlow({
  initialPkg,
  account,
  justRegistered = false,
  discount = null,
  otherDiscounts = [],
  classPromos = [],
}: {
  initialPkg?: string;
  /** They created the account on the way here — `?welcome=1`, read server-side. */
  justRegistered?: boolean;
  account: BuyerAccount;
  /** The one discount being applied — always the largest. Priced server-side. */
  discount?: DiscountOption | null;
  /** Kept, not burned. Shown so nobody thinks they lost one. */
  otherDiscounts?: DiscountOption[];
  /**
   * Live class promos, handed over whole. Eligibility depends on the class the
   * buyer is about to type and the package they are about to pick — neither of
   * which the server has seen when this page renders. The server recomputes the
   * same thing on submit, so this can only ever be a preview.
   */
  classPromos?: ClassPromo[];
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const reduced = useReducedMotion();
  const stepMotion = useMemo(
    () => directionalPanel(NAV.distance.step, reduced),
    [reduced]
  );
  // Only ever used on a first purchase — after that the nickname is settled and
  // shown as a locked card. Seeded with "" because there is nothing of theirs
  // to compare against yet.
  const nickCheck = useNicknameCheck(account.nickname);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Set once the buyer overrides the period themselves. After that the cohort
  // default stops moving under them — a guess that keeps overwriting a decision
  // is worse than no guess.
  const [scopePicked, setScopePicked] = useState(false);
  const [notifyState, setNotifyState] = useState<"idle" | "sending" | "done" | "failed">("idle");

  const [form, setForm] = useState<FormState>({
    // Seeded from the account. Whatever is already there is shown rather than
    // asked for; whatever is blank is asked once and saved back on submit.
    name: account.fullName,
    nickname: account.nickname,
    classCode: account.classCode,
    classOther: "",
    // Derived from the location the account already carries, so a returning
    // buyer never re-answers a question whose answer is implied by their own
    // stored data.
    university: campusForLocation(account.campus),
    jurusan: LATEST_SCOPE.jurusan,
    campus: account.campus,
    campusOther: "",
    angkatan: account.angkatan,
    whatsapp: account.whatsapp,
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
        // The account outranks the draft for anything it already holds: a
        // stale draft must not re-introduce a name the buyer has since
        // corrected in their profile.
        ...(account.fullName ? { name: account.fullName } : {}),
        ...(account.nickname ? { nickname: account.nickname } : {}),
        ...(account.whatsapp ? { whatsapp: account.whatsapp } : {}),
        ...(account.campus ? { campus: account.campus } : {}),
        ...(account.angkatan ? { angkatan: account.angkatan } : {}),
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

  // ─── The Kampus → Jurusan → Lokasi → Kelas chain ───
  const campusDef = useMemo(
    () => CAMPUS_OPTIONS.find((c) => c.id === form.university) ?? CAMPUS_OPTIONS[0],
    [form.university]
  );
  const locationOptions = useMemo(
    () =>
      [...campusDef.locations, OTHER_LOCATION].map((l) => ({
        value: l,
        label: l === OTHER_LOCATION ? t("payments.opt_other") : l,
      })),
    [campusDef, t]
  );
  // Every major this campus teaches — the sellable ones as real choices, the
  // rest listed and locked. It used to filter the unsellable ones away
  // entirely, which left a single-item dropdown that had to be rendered as
  // dead text because a menu that can only say one thing reads as broken.
  // Showing what is coming fixes both: the control is a real picker again, and
  // a student whose major is not ready can see it is on the way instead of
  // concluding haistudy is not for them.
  const jurusanOptions = useMemo(
    () =>
      campusDef.jurusan.map((j) => {
        const open = purchasableScopes().some((s) => s.jurusan === j);
        return {
          value: j,
          label: JURUSAN_LABELS[j] ?? j.toUpperCase(),
          disabled: !open,
          disabledHint: open ? undefined : t("payments.jurusan_soon"),
        };
      }),
    [campusDef, t]
  );
  /** The ones that can actually be bought — what validation cares about. */
  const jurusanOpen = useMemo(
    () => jurusanOptions.filter((o) => !o.disabled),
    [jurusanOptions]
  );
  // Intakes belong to the campus: BINUS counts batches, UNJ counts years.
  const angkatanOptions = useMemo(
    () => angkatanForCampus(form.university).map((a) => ({ value: a, label: a })),
    [form.university]
  );
  // Codes seen at THIS location, plus a way out. The shortcut is what stops
  // "Lb-30" being typed by hand; "Lainnya" is what stops next semester's new
  // code being impossible to enter.
  const classOptions = useMemo(() => {
    const known = CLASSES_BY_LOCATION[form.campus] ?? [];
    return [
      ...known.map((c) => ({ value: c, label: c })),
      { value: "Other", label: t("payments.opt_other") },
    ];
  }, [form.campus, t]);

  const isShare = form.pkg === "share";
  /** Is there anything left to ask, or does the account already hold it all?
   *  Angkatan is not counted: it moved into the campus card, which always shows. */
  const askAnything = !account.fullName || !account.nickname || !account.whatsapp;
  const resolvedClass =
    form.classCode === "Other"
      ? normalizeClassCode(form.classOther)
      : form.classCode;
  // Whether THIS class has a promo in THIS period. Was `resolvedClass === "LE86"`,
  // a class code written into the program; the owner's rule is the class he is
  // currently in, which moves every semester.
  const promoClass = isPromoClass(classPromos, resolvedClass, form.scopeKey);
  const resolvedCampus =
    form.campus === OTHER_LOCATION ? form.campusOther.trim() : form.campus;
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
  // 0 = not a share package. Story = 1 proof. Broadcast = 2 for the class that
  // is getting the promo this period, 1 for everyone else: the wider broadcast
  // is what the discount is in exchange for.
  const requiredShareProofs = !isShare
    ? 0
    : form.shareMethod === "story"
      ? 1
      : promoClass
        ? 2
        : 1;
  // The package's list price, the same for everyone. The class promo comes off
  // as a discount below, where the buyer can see it.
  const listPrice = effectiveBasePrice(form.pkg);
  // Re-priced against the package actually chosen: the server priced the
  // discount against the cheapest one so it had a number before a package
  // existed. Mirrors what the server will charge — this figure is never sent,
  // so the price cannot be talked down from the browser.
  //
  // The WINNER is re-picked too, not just the amount. A percentage discount is
  // worth Rp3.750 on Share and Rp7.500 on Diamond, so someone holding Rp5.000
  // of referral balance as well changes which one is larger simply by choosing
  // a different package. Deciding once, on the cheapest package, would quote a
  // discount the server then disagrees with — and the transfer amount is the
  // only thing the admin has to match the incoming payment against.
  //
  // The class promo joins the same comparison rather than sitting outside it.
  // It used to BE the price (Share cost less for one class), which made it
  // invisible and unable to lose to anything — a buyer with a bigger discount
  // available still paid the promo price.
  const allDiscounts = useMemo(() => {
    const classOption = classDiscountOption(
      classPromos,
      { classCode: resolvedClass, scopeKey: form.scopeKey, pkg: form.pkg },
      listPrice
    );
    return [discount, ...otherDiscounts, classOption].filter(
      Boolean
    ) as DiscountOption[];
  }, [discount, otherDiscounts, classPromos, resolvedClass, form.scopeKey, form.pkg, listPrice]);

  const { best: appliedDiscount, amount: discountAmount } = useMemo(
    () => pickBestDiscount(allDiscounts, listPrice),
    [allDiscounts, listPrice]
  );
  const losingDiscounts = useMemo(
    () => allDiscounts.filter((d) => d !== appliedDiscount),
    [allDiscounts, appliedDiscount]
  );
  const price = Math.max(0, listPrice - discountAmount);
  const uniqueAmount = useMemo(
    () => computeUniqueAmount(price, form.whatsapp),
    [price, form.whatsapp]
  );
  const selectedScope =
    purchasableScopes().find((s) => scopeKey(s) === form.scopeKey) ?? LATEST_SCOPE;

  // Moving campus invalidates everything downstream of it. Leaving a Bekasi
  // class code selected under Kemanggisan is the exact failure the chain
  // exists to prevent, and it is invisible because the field still looks
  // filled in.
  useEffect(() => {
    setForm((f) => {
      const lokasiOk = campusDef.locations.includes(f.campus) || f.campus === OTHER_LOCATION;
      // Angkatan is campus-shaped too: "B29" means nothing at UNJ. Keeping a
      // stale one would submit a cohort this campus does not have.
      const angkatanOk = !f.angkatan || campusDef.angkatan.includes(f.angkatan);
      if (lokasiOk && angkatanOk) return f;
      return {
        ...f,
        ...(lokasiOk ? {} : { campus: "", campusOther: "", classCode: "", classOther: "" }),
        ...(angkatanOk ? {} : { angkatan: "" }),
      };
    });
  }, [campusDef]);

  useEffect(() => {
    setForm((f) => {
      if (!f.classCode || f.classCode === "Other") return f;
      const known = CLASSES_BY_LOCATION[f.campus] ?? [];
      return known.includes(f.classCode) ? f : { ...f, classCode: "" };
    });
  }, [form.campus]);

  // The cohort's likely period, offered until they say otherwise. A guess that
  // overrides a decision is worse than no guess, so it stops the moment the
  // buyer opens the picker and chooses.
  useEffect(() => {
    if (scopePicked || !form.angkatan) return;
    const guess = scopeKey(defaultScopeForAngkatan(form.angkatan, form.jurusan));
    setForm((f) => (f.scopeKey === guess ? f : { ...f, scopeKey: guess }));
  }, [form.angkatan, form.jurusan, scopePicked]);

  // Drop a stale second broadcast proof when it's no longer required
  // (method switched to Story, package changed, or the class no longer has the promo).
  useEffect(() => {
    const keepSecond = isShare && form.shareMethod === "broadcast" && promoClass;
    if (!keepSecond) {
      setForm((f) => (f.shareProof2 ? { ...f, shareProof2: null } : f));
    }
  }, [isShare, form.shareMethod, promoClass]);

  // Whether the period they are holding can actually be bought.
  const pickedScope = parseScopeKey(form.scopeKey);
  const scopeIsOpen = Boolean(pickedScope && isPurchasableScope(pickedScope));

  const validateStep = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.name.trim()) e.name = t("payments.err_required");
      // The shape is checked here; whether anyone else already has it is
      // answered by the live check, which blocks the step only once it has
      // actually come back with "taken". A check that never answered must not
      // stop anyone — the database still has the last word on submit.
      if (!account.nickname) {
        const why = validateNickname(form.nickname);
        if (why) e.nickname = why;
        else if (nickCheck.state === "taken") {
          e.nickname = "Nama panggilan ini sudah dipakai orang lain";
        }
      }
      // Down the chain, in the order it is answered — a missing campus is
      // reported before a missing class, because the class cannot be picked
      // until the campus is.
      if (!campusDef.available) e.university = t("payments.err_campus_soon");
      // The picker now LISTS unsellable majors as "Segera", so "is one on sale"
      // and "did they land on one that is" are two different questions.
      if (!jurusanOpen.length) e.jurusan = t("payments.err_jurusan_none");
      else if (!jurusanOpen.some((o) => o.value === form.jurusan))
        e.jurusan = t("payments.err_jurusan_soon");
      if (!form.campus) e.campus = t("payments.err_required");
      else if (form.campus === OTHER_LOCATION && !form.campusOther.trim())
        e.campusOther = t("payments.err_required");
      if (!form.classCode) e.classCode = t("payments.err_required");
      else if (form.classCode === "Other" && !normalizeClassCode(form.classOther))
        e.classOther = t("payments.err_required");
      if (form.whatsapp.replace(/\D/g, "").length < 8) e.whatsapp = t("payments.err_whatsapp");
      if (!form.angkatan) e.angkatan = t("payments.err_required");
    } else if (s === 1) {
      // A cohort is pre-filled with ITS OWN period, which may be listed as
      // "Segera". Saying so here is the point: the alternative is a buyer who
      // fills in payment details and is refused by the server at the very end,
      // for a period they never chose to be on.
      if (!scopeIsOpen) e.scopeKey = t("payments.scope_soon_hint");
      if (isShare && !form.shareAck) e.shareAck = t("payments.err_share_ack");
    } else if (s === 2) {
      if (!form.paymentMethod) e.paymentMethod = t("payments.err_required");
      if (!form.paymentProof) e.paymentProof = t("payments.err_proof");
      if (isShare && !form.shareMethod) e.shareMethod = t("payments.err_share_method");
      if (isShare && form.shareMethod && !form.shareProof) e.shareProof = t("payments.err_proof");
      if (isShare && form.shareMethod === "broadcast" && promoClass && !form.shareProof2)
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
      // Sent in the one casing the product uses, so the name that reaches the
      // chat is the same one whichever way they typed it.
      fd.set("nickname", normalizeNickname(form.nickname));
      fd.set("whatsapp", form.whatsapp.trim());
      // No email or login method is sent any more. The server takes the buyer
      // from the session cookie, so a forged payload cannot attach someone
      // else's purchase to an address they do not own.
      fd.set("package", form.pkg);
      fd.set("scope", form.scopeKey);
      fd.set("classCode", resolvedClass);
      fd.set("campus", resolvedCampus);
      // Recorded so the admin queue can tell a BINUS Bekasi buyer from a UNJ
      // one without inferring it from a location name.
      fd.set("university", form.university);
      fd.set("angkatan", form.angkatan);
      fd.set("deviceLimit", String(form.deviceLimit));
      fd.set("paymentMethod", form.paymentMethod);
      fd.set("uniqueAmount", String(uniqueAmount));
      fd.set("basePrice", String(price));
      fd.set("source", resolvedSource);
      if (isShare) {
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
          transition={{ type: "spring", stiffness: 300, damping: 35 }}
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

        {/* The one screen where the consequence is real: the order exists and
            is now waiting on something only they can do. */}
        {!account.emailVerified && (
          <div className="mt-3 w-full">
            <VerifyEmailBox email={account.email} context="order" />
          </div>
        )}
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
    // Tighter on a phone, unchanged on a desktop. Every gap here was sized for
    // a wide screen and then inherited by a 390px one, which is how four short
    // steps turned into a page you scroll through twice.
    <div className="mx-auto flex w-full max-w-xl flex-col px-4 py-4 sm:py-8 lg:max-w-4xl">
      {/* Header */}
      <div className="mb-4 flex w-full items-center justify-between sm:mb-5">
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

      {/* Only after signing up on the way here. Keeps the momentum of the
          package they clicked instead of stopping them on a separate
          congratulations screen. */}
      <WelcomeStrip
        show={justRegistered}
        email={account.emailVerified ? undefined : account.email}
      />

      {/* Progress */}
      <div className="mb-4 w-full sm:mb-6">
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
        {/* Sideways, and mirrored on the way back. A step that slid in from the
            right must slide back out to the right when you press Kembali —
            otherwise every move feels like going forwards and the wizard stops
            having a direction at all. */}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={stepMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
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
              // Identity comes from the account now. Anything already on it is
              // SHOWN, not asked for; only the gaps get a field, and those are
              // saved back so the next purchase asks nothing. Kelas is the
              // exception and is always asked: it changes every semester, which
              // is exactly why it lives on the purchase and not on the person.
              <div className="space-y-4">
                <Section
                  title={t("payments.sec_account")}
                  description={t("payments.sec_account_desc")}
                  action={
                    <Link
                      href="/account"
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {t("payments.edit_in_profile")}
                    </Link>
                  }
                >
                  <dl className="grid gap-x-5 gap-y-2.5 lg:grid-cols-2">
                    <SummaryRow label={t("payments.account_email")} value={account.email} />
                    <SummaryRow
                      label={t("payments.account_method")}
                      value={
                        account.authProvider === "google"
                          ? t("payments.login_google")
                          : t("payments.login_password")
                      }
                    />
                    {account.fullName && (
                      <SummaryRow label={t("payments.name_label")} value={account.fullName} />
                    )}
                    {account.nickname && (
                      <SummaryRow
                        label={t("payments.nickname_label")}
                        value={account.nickname}
                      />
                    )}
                    {account.whatsapp && (
                      <SummaryRow label={t("payments.wa_label")} value={account.whatsapp} />
                    )}
                    {account.campus && (
                      <SummaryRow label={t("payments.campus_label")} value={account.campus} />
                    )}
                    {/* Angkatan is NOT repeated here. It moved down into the
                        campus card as an editable field, because it follows the
                        campus; showing it in both places would state it twice
                        and imply the one up here is the locked truth. */}
                  </dl>
                </Section>

                {/* Only when there is actually something to ask.
                    Every field in here is conditional on the account NOT having
                    it, so a returning buyer — the one the whole redesign
                    promises "nol pengetikan ulang" to — was shown a titled card
                    with a subtitle and nothing inside it. An empty box reads as
                    something that failed to load, not as something not needed. */}
                {askAnything && (
                <Section
                  title={t("payments.sec_you")}
                  description={t("payments.sec_you_desc")}
                >
                  <div className="grid gap-y-0 lg:grid-cols-2 lg:gap-x-5">
                    {!account.fullName && (
                      <FieldShell label={t("payments.name_label")} description={t("payments.name_desc")} required error={errors.name} htmlFor="pf-name">
                        <ShortAnswer id="pf-name" value={form.name} onChange={(v) => set("name", v)} placeholder={t("payments.name_ph")} invalid={!!errors.name} autoComplete="name" />
                      </FieldShell>
                    )}

                    {/* Checked while they type. This is the only field on the
                        page whose answer depends on other people, so it is the
                        only one that can fail for a reason nobody could have
                        guessed — and finding that out on the review step, with
                        the payment already filled in, is the worst place for
                        it. Chosen once here; changing it later lives on
                        /account and costs one of their renames. */}
                    {!account.nickname && (
                      <FieldShell
                        label={t("payments.nickname_label")}
                        description={t("payments.nickname_desc")}
                        required
                        error={errors.nickname}
                        htmlFor="pf-nickname"
                      >
                        <div className="flex flex-col gap-1.5">
                          <ShortAnswer
                            id="pf-nickname"
                            value={form.nickname}
                            onChange={(v) => {
                              set("nickname", v);
                              nickCheck.check(v);
                            }}
                            placeholder={t("payments.nickname_ph")}
                            invalid={!!errors.nickname || nickCheck.state === "taken"}
                            autoComplete="nickname"
                            maxLength={NICKNAME_MAX}
                            trailing={<NicknameAdornment state={nickCheck.state} />}
                          />
                          <NicknameHint
                            state={nickCheck.state}
                            reason={nickCheck.reason}
                            suggestions={nickCheck.suggestions}
                            onPick={(v) => {
                              set("nickname", v);
                              nickCheck.check(v);
                            }}
                          />
                        </div>
                      </FieldShell>
                    )}

                    {!account.whatsapp && (
                      <FieldShell label={t("payments.wa_label")} description={t("payments.wa_desc")} required error={errors.whatsapp} htmlFor="pf-wa">
                        <ShortAnswer id="pf-wa" type="tel" inputMode="tel" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} placeholder="0878xxxxxxxx" invalid={!!errors.whatsapp} autoComplete="tel" />
                      </FieldShell>
                    )}
                  </div>
                </Section>
                )}

                {/* Kampus → Jurusan → Lokasi → Kelas, in that order and in one
                    place. These four used to be scattered through the form with
                    the class above the campus, which meant answering them in
                    the order they appeared was answering them backwards.
                    Each one narrows the next; a Bekasi student is never shown a
                    Kemanggisan class code. */}
                <Section
                  title={t("payments.sec_campus")}
                  description={t("payments.sec_campus_desc")}
                >
                  <div className="grid gap-y-0 lg:grid-cols-2 lg:gap-x-5">
                    <div className="lg:col-span-2">
                      <FieldShell label={t("payments.university_label")} required error={errors.university}>
                        <RadioGroup
                          name="university"
                          value={form.university}
                          onChange={(v) => set("university", v)}
                          variant="plain"
                          columns={2}
                          columnsMobile={2}
                          options={CAMPUS_OPTIONS.map((c) => ({
                            value: c.id,
                            label: c.label,
                            disabled: !c.available,
                            disabledHint: c.available ? undefined : t("payments.campus_soon"),
                          }))}
                        />
                      </FieldShell>
                    </div>

                    <div className="lg:col-span-2">
                      <FieldShell label={t("payments.campus_label")} required error={errors.campus || errors.campusOther}>
                        <RadioGroup
                          name="campus"
                          value={form.campus}
                          onChange={(v) => set("campus", v)}
                          variant="plain"
                          columns={4}
                          columnsMobile={2}
                          options={locationOptions}
                        />
                        {form.campus === OTHER_LOCATION && (
                          <div className="mt-2">
                            <ShortAnswer value={form.campusOther} onChange={(v) => set("campusOther", v)} placeholder={t("payments.campus_other_ph")} invalid={!!errors.campusOther} />
                          </div>
                        )}
                      </FieldShell>
                    </div>

                    {/* Always a real picker, even while only one major is on
                        sale. The rest are listed as "Segera" rather than hidden
                        — a locked row says the product is growing, an absent
                        one says it is not for you. */}
                    <FieldShell label={t("payments.jurusan_label")} error={errors.jurusan}>
                      <Dropdown
                        id="pf-jurusan"
                        value={form.jurusan}
                        onChange={(v) => set("jurusan", v)}
                        placeholder={t("payments.jurusan_ph")}
                        invalid={!!errors.jurusan}
                        options={jurusanOptions}
                      />
                    </FieldShell>

                    {/* Angkatan lives here, not up in "Data kamu", because it
                        belongs to the campus: BINUS counts batches (B29/B30),
                        UNJ counts the year you enrolled. Asking it above the
                        campus meant offering both sets to everyone and letting
                        the student work out which half was theirs. */}
                    <FieldShell
                      label={t("payments.angkatan_label")}
                      description={t("payments.angkatan_desc")}
                      required
                      error={errors.angkatan}
                      htmlFor="pf-angkatan"
                    >
                      <Dropdown
                        id="pf-angkatan"
                        value={form.angkatan}
                        onChange={(v) => set("angkatan", v)}
                        placeholder={t("payments.angkatan_ph")}
                        invalid={!!errors.angkatan}
                        options={angkatanOptions}
                      />
                    </FieldShell>

                    <FieldShell
                      className="lg:col-span-2"
                      label={t("payments.class_label")}
                      description={t("payments.class_desc")}
                      required
                      error={errors.classCode || errors.classOther}
                      htmlFor="pf-class"
                    >
                      <Dropdown
                        id="pf-class"
                        value={form.classCode}
                        onChange={(v) => set("classCode", v)}
                        placeholder={
                          form.campus ? t("payments.class_ph") : t("payments.class_needs_campus")
                        }
                        invalid={!!errors.classCode}
                        options={classOptions}
                      />
                      {form.classCode === "Other" && (
                        <div className="mt-2">
                          <ShortAnswer value={form.classOther} onChange={(v) => set("classOther", v)} placeholder={t("payments.class_other_ph")} invalid={!!errors.classOther} />
                        </div>
                      )}
                    </FieldShell>
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

                    {/* Exam period, as an ordinary dropdown.
                        It used to be a line of text with "ganti di sini" tucked
                        under it in 11px grey — the most consequential choice on
                        the page, hidden. It was also two lines tall next to
                        one-line device tiles, which is where the 21px
                        misalignment came from.
                        A radio list was tried first and rejected on sight:
                        seven full-width rows left a 490px hole under the device
                        tiles and outweighed the package cards above. A dropdown
                        is one line, exactly as tall as the tiles beside it, and
                        obviously a control. Locked periods stay in the list as
                        "Segera" — hiding them would read as "my semester is not
                        coming"; selling them would take money for an empty app. */}
                    <FieldShell
                      label={t("payments.scope_current")}
                      description={t("payments.scope_pick_desc")}
                      required
                      error={errors.scopeKey}
                      htmlFor="pf-scope"
                    >
                      <Dropdown
                        id="pf-scope"
                        value={form.scopeKey}
                        onChange={(v) => {
                          setScopePicked(true);
                          set("scopeKey", v);
                        }}
                        options={offeredScopes().map((s) => {
                          const open = isPurchasableScope(s);
                          return {
                            value: scopeKey(s),
                            label: scopeFullLabel(s),
                            disabled: !open,
                            disabledHint: open ? undefined : t("payments.scope_soon"),
                          };
                        })}
                      />
                      {/* A cohort now lands on its own period even when it is
                          not on sale. Honest, but it ends the conversation —
                          and these are exactly the people worth keeping. */}
                      {!scopeIsOpen && (
                        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">
                            {t("payments.scope_notify_desc")}
                          </p>
                          {notifyState === "done" ? (
                            <p className="mt-2 text-xs font-medium text-primary">
                              {t("payments.scope_notify_done")}
                            </p>
                          ) : (
                            <button
                              type="button"
                              disabled={notifyState === "sending"}
                              onClick={async () => {
                                setNotifyState("sending");
                                try {
                                  const res = await fetch(
                                    "/api/account/scope-interest",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        scope: form.scopeKey,
                                        package: form.pkg,
                                      }),
                                    }
                                  );
                                  // fetch only throws on a network failure, so
                                  // the status has to be read. Without this a
                                  // 500 would still say "done" — a promise they
                                  // cannot check and we would never keep.
                                  // A refusal is said out loud. Going back to
                                  // the bare button looked like nothing had
                                  // happened, which reads as "pressed it, it
                                  // worked" — the one thing it must not say.
                                  if (!res.ok) {
                                    setNotifyState("failed");
                                    return;
                                  }
                                } catch {
                                  setNotifyState("failed");
                                  return;
                                }
                                setNotifyState("done");
                              }}
                              className="mt-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                            >
                              {t("payments.scope_notify_cta")}
                            </button>
                          )}
                          {notifyState === "failed" && (
                            <p role="alert" className="mt-2 text-xs text-destructive">
                              {t("payments.scope_notify_error")}
                            </p>
                          )}
                        </div>
                      )}
                    </FieldShell>
                  </div>
                </Section>

                {isShare && (
                  // The same sentence used to appear three times over: as the
                  // section heading, as the field label, and again as the
                  // checkbox label. One statement, said once, with the long
                  // version behind a link.
                  <Section title={t("payments.share_ack_label")}>
                    <ShareTerms
                      checked={form.shareAck}
                      onChange={(v) => set("shareAck", v)}
                      error={errors.shareAck}
                      isPromo={promoClass}
                    />
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
              //
              // The two cards DO stretch to match each other — that part is
              // wanted. What was wrong lived one level down: `FieldShell` also
              // carried `h-full`, so each of the three fields stacked inside the
              // right card claimed the card's full height and bottom-pinned its
              // control to it. 483px of nothing between "Metode Pembayaran" and
              // its own buttons. Fixed in field-shell.tsx, not here.
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-x-5">
                {/* ── LEFT: what to pay, and where ── */}
                <Section title={t("payments.sec_pay")}>
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 text-center">
                    <p className="text-[11px] text-muted-foreground">{t("payments.amount_label")}</p>
                    {/* The old price stays on screen, struck through and
                        small. A discount nobody can see is a discount nobody
                        values — and it is also the only way to prove the
                        number changed for a reason. */}
                    {discountAmount > 0 && (
                      <p className="text-sm text-muted-foreground line-through">
                        {formatIDR(listPrice)}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => copy(String(uniqueAmount))}
                      className="mt-0.5 inline-flex items-center gap-2 font-display text-3xl font-bold text-foreground"
                    >
                      {formatIDR(uniqueAmount)}
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </button>

                    {discountAmount > 0 && appliedDiscount && (
                      <div className="mt-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-left">
                        <p className="flex items-center justify-between gap-2 text-xs font-semibold text-primary">
                          <span>{appliedDiscount.label}</span>
                          <span>−{formatIDR(discountAmount)}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {appliedDiscount.detail}
                        </p>
                      </div>
                    )}

                    {/* Losing a comparison is not the same as being spent. Say
                        so, or the one that lost looks like it vanished. */}
                    {losingDiscounts.length > 0 && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        Potongan lain yang kamu punya (
                        {losingDiscounts.map((d) => d.label).join(", ")}) tidak hangus dan
                        tetap bisa dipakai lain kali. Potongan tidak bisa digabung, jadi
                        yang terbesar yang dipakai.
                      </p>
                    )}
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
                      openHint={t("payments.qris_open")}
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
                                description: promoClass
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

                        {form.shareMethod === "broadcast" && promoClass && (
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
              //
              // `items-start` applies at EVERY width, not just `lg:`. On a phone
              // the cells stretched, which handed the left cell a definite
              // height — and the two ReviewSections inside it each ask for
              // `h-full`. Two 424px cards inside a 424px cell: the second one
              // spilled out and painted straight over the payment card, 170px
              // of it, on the last screen before someone pays.
              <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-x-5">
                <div className="space-y-4">
                <ReviewSection title={t("payments.step_identity")} onEdit={() => jumpTo(0)} editLabel={t("common.edit")}>
                  <ReviewRow label={t("payments.account_email")} value={account.email} />
                  <ReviewRow label={t("payments.name_label")} value={form.name} />
                  <ReviewRow label={t("payments.class_label")} value={resolvedClass} />
                  <ReviewRow label={t("payments.angkatan_label")} value={form.angkatan} />
                  <ReviewRow label={t("payments.campus_label")} value={resolvedCampus} />
                  <ReviewRow label={t("payments.wa_label")} value={form.whatsapp} />
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
                  {isShare && form.shareMethod === "broadcast" && promoClass && (
                    <ReviewRow label={t("payments.proof_broadcast2_label")} value={form.shareProof2 ? "✓" : "—"} />
                  )}
                  <ReviewRow label={t("payments.source_label")} value={sourceLabel} />
                </ReviewSection>

                <div className="space-y-1.5 lg:col-span-2">
                  <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                    {t("payments.review_note")}
                  </p>
                  {/* Said before the money moves, not after. A quiet line and
                      not a warning box on purpose: an alert here is friction at
                      the worst possible moment and they cannot act on it
                      without abandoning the form. But hiding a condition on
                      approval from someone about to pay is worse than one extra
                      line of small print. */}
                  {!account.emailVerified && <VerifyEmailInline email={account.email} />}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      {/* Sticky on a phone. The buyer's thumb sits at the bottom of the screen,
          and on a long step the only way to reach Lanjut was to scroll past
          everything they had just filled in. */}
      {/* No `mx-auto` on the phone breakpoint: it fights `-mx-4` for the same
          margin property, and when it won the bar stayed 32px wider than its
          parent without the negative offset that pays for it — the page could
          be dragged sideways. `sm:mx-auto` still centres it on a desktop. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-5 flex w-[calc(100%+2rem)] gap-2.5 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-auto sm:mt-7 sm:w-full sm:max-w-xl sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
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

/**
 * The Share package's one condition, plus the message that fulfils it.
 *
 * Two things were wrong here. The sentence "Saya setuju memenuhi syarat share"
 * appeared three times on one screen — heading, field label, checkbox — which
 * is what made the section read like a form shouting. And the terms told
 * people to broadcast haistudy to their friends without giving them anything
 * to broadcast, so everyone wrote their own and half of them left out the
 * link.
 *
 * Now: one statement, the long version behind a link, and a ready-made message
 * they can send in two taps.
 */
function ShareTerms({
  checked,
  onChange,
  error,
  isPromo,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  /** This class has a promo this period: it owes the wider broadcast. */
  isPromo: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const broadcast = t("payments.share_broadcast_text").replace(
    "{url}",
    typeof window === "undefined" ? "https://haistudy.site" : window.location.origin
  );

  return (
    <div className="flex flex-col gap-3">
      <CheckboxField
        checked={checked}
        onChange={onChange}
        label={t("payments.share_ack_check")}
        invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {t("payments.share_read_terms")}
      </button>

      {isPromo && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-300">
          {t("payments.share_promo_note")}
        </p>
      )}

      {/* The thing they are actually being asked to send. Copy for wherever
          they like, or straight into WhatsApp — a condition nobody can meet
          without writing their own copy is a condition half of them will get
          wrong. */}
      <div className="rounded-xl border border-border bg-muted/20 p-3">
        <p className="text-xs font-semibold text-foreground">
          {t("payments.share_broadcast_label")}
        </p>
        <p className="mt-1.5 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">
          {broadcast}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(broadcast);
              toast.success(t("payments.copied"));
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Copy className="h-3.5 w-3.5" />
            {t("payments.share_copy")}
          </button>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(broadcast)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t("payments.share_send_wa")}
          </a>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("payments.share_ack_label")}</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {t("payments.share_ack_desc")}
          </p>
        </DialogContent>
      </Dialog>
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
