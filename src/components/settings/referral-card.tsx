"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { fadeIn } from "@/lib/motion";
import { toast } from "sonner";

export function ReferralCard() {
  const { session } = useSession();
  const { t } = useTranslation();
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReferral = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(
        `/api/referral?licenseKey=${encodeURIComponent(session.licenseKey)}`
      );
      const data = await res.json();
      if (data.referralCode) setCode(data.referralCode);
      if (data.referralCount !== undefined) setCount(data.referralCount);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchReferral();
  }, [fetchReferral]);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(t("settings.referral_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("settings.copy_failed"));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{t("settings.referral_title")}</span>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-16 animate-pulse rounded-lg bg-muted"
          />
        ) : (
          <motion.div
            key="content"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="rounded-lg border border-border bg-muted/30 p-3"
          >
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-background px-3 py-1.5 font-mono text-sm">
                {code || "-"}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleCopy}
                disabled={!code}
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? t("common.copied") : t("common.copy")}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("settings.referral_share")}{" "}
              {count > 0 ? (
                <span className="font-medium text-primary">
                  {count} {t("settings.referral_count")}
                </span>
              ) : (
                t("settings.referral_empty")
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
