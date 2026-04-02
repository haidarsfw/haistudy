"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";

interface PostTutorialContactProps {
  onDone: () => void;
}

export function PostTutorialContact({ onDone }: PostTutorialContactProps) {
  const { t } = useTranslation();
  const { updateProfile, saving } = useProfile();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const handleSave = async () => {
    sounds.send();
    const updates: { phone?: string; email?: string } = {};
    if (phone.trim()) updates.phone = phone.trim();
    if (email.trim()) updates.email = email.trim();
    if (Object.keys(updates).length > 0) {
      await updateProfile(updates);
    }
    onDone();
  };

  const handleSkip = () => {
    sounds.click();
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-heading text-lg font-bold">
              {t("onboarding.post_contact_title")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("onboarding.post_contact_desc")}
            </p>
            <p className="mt-1.5 text-[10px] text-muted-foreground/70 leading-relaxed">
              Informasi ini digunakan untuk layanan support langsung, pemberitahuan update, dan memastikan kepemilikan akun kamu.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {t("onboarding.post_contact_phone")}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {t("onboarding.post_contact_email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSkip}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted cursor-pointer"
            >
              {t("onboarding.post_contact_skip")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "..." : t("onboarding.post_contact_save")}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
