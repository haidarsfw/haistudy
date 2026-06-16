"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  Loader2,
  AlertCircle,
  Gift,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/providers/session-provider";
import { getDeviceId, getDeviceType } from "@/lib/auth/device";
import { LATEST_SCOPE, scopeKey } from "@/lib/scope";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  formatLockoutTime,
} from "@/lib/auth/rate-limit";
import { fadeInDown, scaleIn, tapScale, hoverLift } from "@/lib/motion";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export interface LoginFormProps {
  oauthError?: string | null;
  oauthEmail?: string | null;
  oauthDetail?: string | null;
}

function oauthErrorBanner(
  code: string,
  email: string | null,
  detail: string | null
): string {
  switch (code) {
    case "email_not_linked":
      return email
        ? `Email ${email} belum didaftarkan admin. Login dengan license key atau hubungi admin.`
        : "Email belum didaftarkan admin. Login dengan license key atau hubungi admin.";
    case "use_key_login":
      return "Akun ini login dengan license key, bukan Google. Masukkan license key kamu di bawah.";
    case "no_email":
      return "Akun Google tidak memberikan alamat email. Coba dengan akun lain.";
    case "suspended":
      return "License terkait sedang disuspend. Hubungi admin.";
    case "expired":
      return "License terkait sudah expired. Hubungi admin untuk perpanjangan.";
    case "device_limit":
      return "Batas device tercapai. Reset via admin atau hubungi support.";
    case "cancelled":
      return "Login dibatalkan.";
    case "no_code":
      return "Login Google tidak lengkap. Coba ulang dari awal.";
    case "license_not_found":
      return "License key terkait sudah dihapus. Hubungi admin.";
    case "not_configured":
      return "Supabase Auth belum terkonfigurasi. Gunakan license key.";
    case "exchange_failed":
      return detail
        ? `Login Google gagal: ${detail}. Cek Supabase Dashboard → Authentication → Providers → Google (Client ID/Secret) dan Google Cloud Console → Authorized redirect URIs.`
        : "Login Google gagal saat exchange. Cek konfigurasi Google Provider di Supabase.";
    case "activation_failed":
      return "Aktivasi license gagal. Hubungi admin.";
    case "server_error":
      return "Server error saat login Google. Coba lagi.";
    default:
      return "Login Google gagal. Coba lagi atau gunakan license key.";
  }
}

export function LoginForm({
  oauthError,
  oauthEmail,
  oauthDetail,
}: LoginFormProps = {}) {
  const { t } = useTranslation();
  const banner = oauthError
    ? oauthErrorBanner(oauthError, oauthEmail ?? null, oauthDetail ?? null)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <HashErrorListener />
      {banner && <OauthErrorBanner message={banner} />}

      {isSupabaseConfigured && (
        <>
          <GoogleLoginButton />

          <div className="relative flex items-center" aria-hidden="true">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-[11px] uppercase tracking-wider text-muted-foreground/70">
              {t("login.or_divider")}
            </span>
            <div className="flex-1 border-t border-border" />
          </div>
        </>
      )}

      <LicenseKeyLoginForm />
    </div>
  );
}

/**
 * When Supabase Auth fails server-side (e.g. "Unable to exchange external code"),
 * it redirects back with the error in the URL hash. The hash is client-only and
 * never reaches our /auth/callback route handler, so we capture it here and
 * surface a real error message to the user.
 */
function HashErrorListener() {
  const [hashError, setHashError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || !hash.includes("error")) return;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const desc = params.get("error_description");
    const code = params.get("error_code") || params.get("error");
    if (desc || code) {
      const human = desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : code!;
      setHashError(human);
      // Clear the hash so refresh doesn't re-show it.
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
    }
  }, []);

  if (!hashError) return null;
  return <OauthErrorBanner message={`Login Google gagal: ${hashError}`} />;
}

function OauthErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function LicenseKeyLoginForm() {
  const router = useRouter();
  const { login } = useSession();
  const [key, setKey] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showReferral, setShowReferral] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutMs, setLockoutMs] = useState(0);
  const [showKey, setShowKey] = useState(false);
  const { t } = useTranslation();

  // Check rate limit on mount and tick countdown
  useEffect(() => {
    const { allowed, remainingMs } = checkRateLimit();
    if (!allowed) setLockoutMs(remainingMs);
  }, []);

  useEffect(() => {
    if (lockoutMs <= 0) return;
    const interval = setInterval(() => {
      setLockoutMs((prev) => {
        const next = prev - 1000;
        return next <= 0 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutMs > 0]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      const trimmedKey = key.trim();
      if (!trimmedKey) {
        setError(t("login.enter_key"));
        return;
      }

      const { allowed, remainingMs } = checkRateLimit();
      if (!allowed) {
        setLockoutMs(remainingMs);
        setError(
          `${t("login.too_many_attempts")} ${formatLockoutTime(remainingMs)}`
        );
        return;
      }

      setLoading(true);

      try {
        const deviceId = getDeviceId();
        const deviceType = getDeviceType();

        const res = await fetch("/api/auth/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: trimmedKey,
            deviceId,
            deviceType,
            referralCode: referralCode.trim() || undefined,
          }),
        });

        const data = await res.json();

        if (!data.valid) {
          // Known-valid key on the wrong login path — don't penalize the user.
          if (data.reason === "wrong_method") {
            setError(data.error || t("login.login_failed"));
            return;
          }
          const result = recordFailedAttempt();
          if (result.locked) {
            setLockoutMs(result.lockoutMs);
            setError(
              `${data.error}. ${t("login.too_many_attempts")} ${formatLockoutTime(result.lockoutMs)}`
            );
          } else {
            setError(data.error || t("login.login_failed"));
          }
          return;
        }

        resetRateLimit();

        // Use settings embedded in validate response (fast path)
        let selectedClass = "";
        const embeddedSettings = data.settings;

        if (embeddedSettings) {
          selectedClass = embeddedSettings.selectedClass || "";
          if (embeddedSettings.darkMode !== undefined) {
            localStorage.setItem("dark", JSON.stringify(embeddedSettings.darkMode));
          }
          if (embeddedSettings.theme) {
            localStorage.setItem("theme", JSON.stringify(embeddedSettings.theme));
          }
          if (embeddedSettings.font) {
            localStorage.setItem("font", JSON.stringify(embeddedSettings.font));
          }
          if (embeddedSettings.darkModeSchedule) {
            localStorage.setItem(
              "darkModeSchedule",
              JSON.stringify(embeddedSettings.darkModeSchedule)
            );
          }
        } else {
          try {
            const settingsRes = await fetch(
              `/api/settings?licenseKey=${encodeURIComponent(data.session.licenseKey)}`
            );
            const settingsData = await settingsRes.json();
            if (settingsData.settings) {
              selectedClass = settingsData.settings.selectedClass || "";
              if (settingsData.settings.darkMode !== undefined) {
                localStorage.setItem("dark", JSON.stringify(settingsData.settings.darkMode));
              }
              if (settingsData.settings.theme) {
                localStorage.setItem("theme", JSON.stringify(settingsData.settings.theme));
              }
              if (settingsData.settings.font) {
                localStorage.setItem("font", JSON.stringify(settingsData.settings.font));
              }
              if (settingsData.settings.darkModeSchedule) {
                localStorage.setItem(
                  "darkModeSchedule",
                  JSON.stringify(settingsData.settings.darkModeSchedule)
                );
              }
            }
          } catch {
            const existingSession = JSON.parse(
              localStorage.getItem("hs-session-data") || "null"
            );
            selectedClass = existingSession?.selectedClass || "";
          }
        }

        // Admin login: force LATEST_SCOPE locally even though server cookie is already correct
        const baseSession = {
          ...data.session,
          selectedClass: data.session.selectedClass || selectedClass,
        };
        const sessionWithClass = baseSession.isAdmin
          ? {
              ...baseSession,
              scope: LATEST_SCOPE,
              scopeKey: scopeKey(LATEST_SCOPE),
            }
          : baseSession;

        if (sessionWithClass.isAdmin) {
          try {
            localStorage.setItem("hs-admin-scope", scopeKey(LATEST_SCOPE));
          } catch {
            /* localStorage unavailable */
          }
        }

        // Fresh login: the slide-learning tip reappears (must be dismissed again).
        try {
          localStorage.removeItem("hs-tip-dismissed");
        } catch {}

        login(sessionWithClass);
        sounds.loginSuccess();

        const base = `/s${sessionWithClass.scope.semester}/${sessionWithClass.scope.examPeriod}/${sessionWithClass.scope.jurusan}`;
        router.replace(`${base}/dashboard`);
      } catch {
        setError(t("login.connection_failed"));
      } finally {
        setLoading(false);
      }
    },
    [key, referralCode, login, router, t]
  );

  const isLocked = lockoutMs > 0;

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      variants={scaleIn}
      initial="hidden"
      animate="visible"
    >
      {/* License Key Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="license-key" className="text-sm font-medium">
          License Key
        </Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="license-key"
            type={showKey ? "text" : "password"}
            placeholder={t("login.enter_license_key")}
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            disabled={loading || isLocked}
            autoFocus
            autoComplete="off"
            className="pl-10 pr-10 uppercase tracking-wider placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40"
          />
          <button
            type="button"
            onClick={() => {
              sounds.toggle();
              setShowKey((v) => !v);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showKey ? "Sembunyikan license key" : "Tampilkan license key"}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Referral Code (collapsible) */}
      <AnimatePresence mode="wait">
        {!showReferral ? (
          <motion.button
            key="referral-trigger"
            type="button"
            onClick={() => {
              sounds.toggle();
              setShowReferral(true);
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
            variants={fadeInDown}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <Gift className="h-3.5 w-3.5" />
            {t("login.have_referral")}
          </motion.button>
        ) : (
          <motion.div
            key="referral-input"
            className="flex flex-col gap-2"
            variants={fadeInDown}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <Label htmlFor="referral" className="text-xs text-muted-foreground">
              {t("login.referral_optional")}
            </Label>
            <Input
              id="referral"
              type="text"
              placeholder={t("login.enter_referral")}
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              disabled={loading}
              className="text-sm uppercase tracking-wider placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            variants={fadeInDown}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lockout Timer */}
      {isLocked && (
        <p className="text-center text-xs text-muted-foreground">
          {t("login.wait_before_retry")} {formatLockoutTime(lockoutMs)}
        </p>
      )}

      {/* Submit Button */}
      <motion.div whileHover={hoverLift} whileTap={tapScale}>
        <Button
          type="submit"
          disabled={loading || isLocked || !key.trim()}
          className="h-11 text-sm font-medium w-full disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("login.validating")}
            </>
          ) : (
            t("login.enter")
          )}
        </Button>
      </motion.div>

      {/* Incognito warning */}
      <p className="text-center text-[11px] text-muted-foreground/70 leading-relaxed">
        Jangan login menggunakan mode Private / Incognito. Setiap sesi incognito dihitung sebagai perangkat baru dan dapat melebihi batas perangkat Anda.
      </p>

      {/* Dev hint */}
      {process.env.NODE_ENV === "development" && (
        <p className="text-center text-[10px] text-muted-foreground/80">
          Dev: gunakan ADMIN1 atau PREVIEW01
        </p>
      )}
    </motion.form>
  );
}
