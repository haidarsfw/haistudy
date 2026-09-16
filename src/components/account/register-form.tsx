"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Gift,
  Loader2,
  X,
} from "lucide-react";

import { AuthCardHeader, AuthDivider } from "@/components/account/auth-shell";
import {
  AuthField,
  AuthSubmit,
  PasswordChecklist,
  Reveal,
} from "@/components/account/auth-field";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { VerifyEmailBox } from "@/components/account/verify-email-notice";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/auth/password-rules";
import { easeEnter, NAV } from "@/lib/motion";
import { refreshAccount } from "@/hooks/use-account";
import { sounds } from "@/lib/sounds";

/**
 * Create an account.
 *
 * Two fields, matching exactly what signing in with Google hands over, so
 * neither path asks for more than the other. Everything a purchase needs
 * (nama, panggilan, WhatsApp, kampus, kelas) is collected once at the first
 * checkout and kept on the account from then on.
 */
// Catches the typo, not every address the RFC allows. A real one still has to
// survive the confirmation mail.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Tack the confirmation flag onto wherever they were going, without assuming
 * the path is clean — `/payments?pkg=vip` already has a query string, and
 * blindly appending `?welcome=1` would produce two of them.
 */
function withWelcome(path: string): string {
  return path.includes("?") ? `${path}&welcome=1` : `${path}?welcome=1`;
}

export function RegisterForm({ next }: { next?: string }) {
  /** Set only on the no-destination path — see the two endings in submit(). */
  const [registered, setRegistered] = useState<string | null>(null);
  // Whether the confirmation mail actually left. The success screen says
  // something different when it did not, instead of pointing at an inbox that
  // will stay empty.
  const [mailSent, setMailSent] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState("");
  const [showReferral, setShowReferral] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Set when the code arrived from a partner link rather than being typed. */
  const [fromLink, setFromLink] = useState(false);

  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  /**
   * Checked on blur, not on every keystroke: a code is pasted or typed in one
   * go, and firing per character would both flood the endpoint and start
   * telling someone their code is wrong while they are still writing it.
   *
   * "unchecked" is the state that matters. It means the answer never came
   * back — offline, rate limited, server down — and it must NOT behave like
   * "invalid". Blocking a signup because OUR check failed is the failure mode
   * this whole flow is built to avoid.
   */
  const [refState, setRefState] = useState<
    "idle" | "checking" | "valid" | "invalid" | "unchecked"
  >("idle");

  const verifyReferral = async (override?: string) => {
    // `override` exists for the prefill below: state set in the same tick is
    // not readable here yet, and a code that never gets checked never reaches
    // the Google button, which only carries a code once it is confirmed.
    const code = (override ?? referral).trim();
    if (!code) {
      setRefState("idle");
      return;
    }
    setRefState("checking");
    try {
      const res = await fetch(
        `/api/account/referral/check?code=${encodeURIComponent(code)}`
      );
      const data = (await res.json()) as { valid: boolean | null; code?: string };
      if (data.valid === true) {
        if (data.code) setReferral(data.code);
        setRefState("valid");
        setErrors((e) => ({ ...e, referralCode: "" }));
      } else if (data.valid === false) {
        setRefState("invalid");
      } else {
        setRefState("unchecked");
      }
    } catch {
      setRefState("unchecked");
    }
  };

  // A partner link (`/@nama`) leaves the code in `hs-ref`. Without this the
  // field stays collapsed and empty, the person never learns a code is in play,
  // and choosing Google would clear the cookie on the way out — losing the
  // referral between the link and the signup it was meant to credit.
  useEffect(() => {
    try {
      const hit = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("hs-ref="));
      if (!hit) return;
      const code = decodeURIComponent(hit.slice("hs-ref=".length)).trim();
      if (!code) return;
      setReferral(code);
      setShowReferral(true);
      setFromLink(true);
      void verifyReferral(code);
    } catch {
      // Cookies unavailable — the field simply stays empty.
    }
    // Once, on mount. The cookie does not change under us.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent, dropReferral = false) => {
    e.preventDefault();
    if (loading) return;

    setErrors({});
    setBanner(null);

    // Mirrors the server. Only saves a round trip; the server re-checks.
    const local: Record<string, string> = {};
    if (!email.trim()) local.email = "Email wajib diisi";
    else if (!EMAIL_RE.test(email.trim())) local.email = "Format emailnya belum benar";
    if (!password) local.password = "Password wajib diisi";
    else {
      // The specific rule that failed, not "belum memenuhi syarat" — the
      // button can be pressed now, so the message has to do the explaining.
      const why = validatePassword(password);
      if (why) local.password = why;
    }
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    // The block, with its door left open. A code we KNOW is wrong stops the
    // submit — otherwise someone loses their referral silently, which is the
    // thing this was built to prevent. But the message carries a one-tap way
    // past it, and a code we merely failed to check never blocks at all.
    const codeToSend = dropReferral ? "" : referral.trim();
    if (codeToSend && refState === "invalid") {
      setShowReferral(true);
      setErrors({
        referralCode: `Kode ${codeToSend} nggak kami kenali. Cek lagi, atau lanjut tanpa kode.`,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          // No name is sent. Deriving one from the address produced things
          // like "akunfotoalkhalifah" and then greeted people by it across the
          // whole site. The real name is collected once at checkout or in the
          // account page, and until then nothing pretends to know it.
          referralCode: codeToSend || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        field?: string;
        /** The server waits for the confirmation mail and reports the result. */
        verifyMailSent?: boolean;
      };

      if (!res.ok || !data.ok) {
        if (data.field) {
          setErrors({ [data.field]: data.error ?? "Tidak valid" });
          // The server is the last word on a code. If it says no, open the
          // panel so the rejected field is actually on screen — an error
          // pointing at something collapsed is an error nobody can act on.
          if (data.field === "referralCode") {
            setShowReferral(true);
            setRefState("invalid");
          }
        } else setBanner(data.error ?? "Gagal membuat akun. Coba lagi.");
        return;
      }

      sounds.loginSuccess();

      // Two endings, because there are two kinds of person here.
      //
      // Someone who arrived from clicking a package is mid-purchase. They get
      // sent straight on with a confirmation strip waiting for them: putting a
      // congratulations screen between a person and the thing they were about
      // to buy is just one more place to change your mind.
      //
      // Someone who registered on their own has no destination, and dropping
      // them on /account with nothing to do is a dead end. They get the real
      // success screen, right here in the card, with the next step on it.
      if (next) {
        // Full navigation, not router.replace. Who-is-signed-in is cached at
        // module level so the header and the hero share one request; a
        // client-side navigation keeps that module alive, so the cache still
        // said "signed out" from before the account existed — register, go to
        // checkout, press Back, and the landing page offers you "Daftar"
        // again. A real page load throws the cache away with everything else.
        window.location.href = withWelcome(next);
        return;
      }
      // Who-is-signed-in is cached at module level so the header and the hero
      // share one request, and that cache still says "signed out" from before
      // this account existed. Dropping it here is what lets the success screen
      // link onward normally instead of forcing a full page load to clear it.
      refreshAccount();
      setMailSent(data.verifyMailSent !== false);
      setRegistered(email.trim());
    } catch {
      setBanner("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Success, for the person who came here on their own ───
  if (registered) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: NAV.enter, ease: easeEnter }}
        className="flex flex-col items-center gap-5 text-center"
      >
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.06, duration: 0.34, ease: [0.34, 1.4, 0.64, 1] }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
        >
          <CheckCircle2 className="h-7 w-7 text-primary" strokeWidth={2.2} />
        </motion.div>

        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
            Akunmu sudah jadi
          </h2>
          <p className="mt-1 break-all text-[13px] text-muted-foreground">{registered}</p>
        </div>

        {/* One obvious next thing. An account on its own does not open
            anything yet, and saying that plainly beats letting someone find
            out by landing on an empty account page. */}
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tinggal satu langkah lagi: pilih paket buat periode ini.
        </p>

        {/* Ordinary links, not a hard reload. The account cache was dropped the
            moment this screen appeared, so the header on the next page already
            knows who this is. */}
        <div className="flex w-full flex-col gap-2">
          <Link
            href="/payments"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Pilih paket & bayar
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/account"
            className="inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Nanti saja, buka Akun
          </Link>
        </div>

        <div className="w-full">
          <VerifyEmailBox email={registered} context="signup" mailSent={mailSent} />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Title only. The column beside it already explains what an account is
          for; saying it again here is what made the page feel like it was
          repeating itself. */}
      <AuthCardHeader title="Buat akun" />

      {banner && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {isSupabaseConfigured && (
        <>
          {/* The code goes with them. Choosing Google used to throw away
              whatever was typed in the referral box. */}
          <GoogleLoginButton
            next={next}
            label="Daftar dengan Google"
            referral={refState === "valid" ? referral : undefined}
            hint="Langsung terkonfirmasi, tanpa cek email"
          />
          <AuthDivider />
        </>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <AuthField
          id="reg-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="kamu@email.com"
          autoComplete="email"
          error={errors.email}
        />

        <div className="flex flex-col gap-2">
          <AuthField
            id="reg-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Buat password"
            autoComplete="new-password"
            error={errors.password}
          />
          <PasswordChecklist password={password} />
        </div>

        {/* A disclosure that closes again. It only opened before, so someone
            who tapped it out of curiosity was stuck with a field they did not
            want. Last in the form, so an optional field never sits between two
            required ones. */}
        <div>
          <button
            type="button"
            onClick={() => setShowReferral((v) => !v)}
            aria-expanded={showReferral}
            aria-controls="reg-referral-panel"
            className="flex items-center gap-1.5 rounded text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Gift className="h-3.5 w-3.5" />
            {/* A code that arrived on a link was never "typed", so asking
                whether they have one reads as if nothing happened. */}
            {fromLink ? "Kode dari undangan temanmu" : "Punya kode referral?"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                showReferral ? "rotate-180" : ""
              }`}
            />
          </button>

          <Reveal open={showReferral}>
            <div id="reg-referral-panel" className="pt-2.5">
              {refState === "valid" ? (
                // Collapsed into a chip once it lands. It is confirmation and
                // an undo in the same object, and it stops the code sitting
                // there looking like one more thing left to do.
                <motion.div
                  // A small pop when it lands. The whole point of the chip is
                  // that a code being accepted should feel like something
                  // happened; appearing silently reads as the field having
                  // simply gone away.
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.28, ease: [0.34, 1.4, 0.64, 1] }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-primary">
                    <motion.span
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.06, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                      className="flex shrink-0"
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </motion.span>
                    <span className="truncate font-medium">{referral}</span>
                    <span className="shrink-0 text-muted-foreground">dipakai</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReferral("");
                      setRefState("idle");
                    }}
                    aria-label="Hapus kode referral"
                    className="shrink-0 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ) : (
                <>
                  <AuthField
                    id="reg-referral"
                    label="Kode referral"
                    value={referral}
                    onChange={(v) => {
                      setReferral(v.toUpperCase());
                      if (refState !== "idle") setRefState("idle");
                      if (errors.referralCode) {
                        setErrors((e) => ({ ...e, referralCode: "" }));
                      }
                    }}
                    onBlur={verifyReferral}
                    placeholder="Kode dari teman"
                    autoComplete="off"
                    maxLength={32}
                    hint="Opsional"
                    error={errors.referralCode || undefined}
                    trailing={
                      refState === "checking" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : null
                    }
                  />
                  {errors.referralCode && (
                    <button
                      type="button"
                      onClick={(e) => submit(e, true)}
                      className="mt-1.5 rounded text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      Lanjut tanpa kode
                    </button>
                  )}
                </>
              )}
            </div>
          </Reveal>
        </div>

        {/* Enabled even when the password is short. A dead button explains
            nothing on its own, and the grid above already says which rule is
            missing; pressing it now points at the offending field instead of
            leaving people poking at something that will not respond. */}
        <AuthSubmit loading={loading} loadingLabel="Membuat akun...">
          Daftar
        </AuthSubmit>
      </form>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
        Dengan mendaftar kamu setuju dengan{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
          Ketentuan Layanan
        </Link>{" "}
        dan{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Kebijakan Privasi
        </Link>
        .
      </p>

      <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          href={loginHref}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Masuk
        </Link>
      </div>
    </div>
  );
}
