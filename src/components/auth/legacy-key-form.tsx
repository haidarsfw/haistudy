"use client";

/**
 * License-key sign-in. The old way in, kept alive but taken off the page.
 *
 * haistudy now sells access to an ACCOUNT, not a key, and `/login` shows only
 * Google and e-mail+password. This form is still reachable at `/login?legacy=1`
 * with no link pointing at it, for two reasons: the two admin licences never
 * expire and one of them has no e-mail address on file, and a key holder who
 * cannot get in during exam week has no other door.
 *
 * Delete this file, its route branch, and `/api/auth/validate` once every
 * remaining key has expired and both admins have accounts.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Loader2, AlertCircle, Gift, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/providers/session-provider";
import { getDeviceId, getDeviceType } from "@/lib/auth/device";
import { clearRealtimeToken } from "@/lib/supabase/realtime-token";
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

export function LegacyKeyForm() {
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
        setError(`${t("login.too_many_attempts")} ${formatLockoutTime(remainingMs)}`);
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
          // A real key on the wrong door — don't spend one of their attempts.
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
        }

        const baseSession = {
          ...data.session,
          selectedClass: data.session.selectedClass || selectedClass,
        };
        const sessionWithClass = baseSession.isAdmin
          ? { ...baseSession, scope: LATEST_SCOPE, scopeKey: scopeKey(LATEST_SCOPE) }
          : baseSession;

        if (sessionWithClass.isAdmin) {
          try {
            localStorage.setItem("hs-admin-scope", scopeKey(LATEST_SCOPE));
          } catch {
            /* localStorage unavailable */
          }
        }

        try {
          localStorage.removeItem("hs-tip-dismissed");
        } catch {}

        login(sessionWithClass);
        clearRealtimeToken();
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            tabIndex={-1}
            aria-label={showKey ? "Sembunyikan license key" : "Tampilkan license key"}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!showReferral ? (
          <motion.button
            key="referral-trigger"
            type="button"
            onClick={() => {
              sounds.toggle();
              setShowReferral(true);
            }}
            className="flex items-center gap-1.5 self-start text-xs text-muted-foreground transition-colors hover:text-foreground"
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

      <AnimatePresence>
        {error && (
          <motion.div
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            variants={fadeInDown}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isLocked && (
        <p className="text-center text-xs text-muted-foreground">
          {t("login.wait_before_retry")} {formatLockoutTime(lockoutMs)}
        </p>
      )}

      <motion.div whileHover={hoverLift} whileTap={tapScale}>
        <Button
          type="submit"
          disabled={loading || isLocked || !key.trim()}
          className="h-11 w-full text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
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

      {process.env.NODE_ENV === "development" && (
        <p className="text-center text-[10px] text-muted-foreground/80">
          Dev: gunakan ADMIN1 atau PREVIEW01
        </p>
      )}
    </motion.form>
  );
}
