"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Share2,
  GraduationCap,
  Crown,
  Info,
} from "lucide-react";
import { PURCHASE_FORM_URL } from "@/lib/constants";
import { springSmooth } from "@/lib/motion";
import { useTranslation } from "@/components/providers/language-provider";
import { translate } from "@/lib/i18n";

export function PricingSection() {
  const [selectedPkg, setSelectedPkg] = useState("normal");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { t: rawT } = useTranslation();
  const t = mounted ? rawT : (key: string) => translate("id", key);

  const PACKAGES = [
    {
      id: "share",
      name: t("pricing.share_name"),
      price: "Rp 20.000",
      duration: t("pricing.per_duration"),
      badge: t("pricing.share_badge"),
      icon: Share2,
      description: t("pricing.share_desc"),
      features: [
        t("pricing.feat_all_subjects"),
        t("pricing.feat_quiz_flash"),
        t("pricing.feat_ai"),
        t("pricing.feat_forum"),
        t("pricing.feat_voice"),
        t("pricing.feat_max_device"),
      ],
      callout: t("pricing.share_callout"),
      details: t("pricing.share_details"),
    },
    {
      id: "normal",
      name: t("pricing.normal_name"),
      price: "Rp 25.000",
      duration: t("pricing.per_duration"),
      badge: t("pricing.normal_badge"),
      icon: GraduationCap,
      description: t("pricing.normal_desc"),
      features: [
        t("pricing.feat_all_subjects"),
        t("pricing.feat_quiz_flash"),
        t("pricing.feat_ai"),
        t("pricing.feat_forum"),
        t("pricing.feat_voice"),
        t("pricing.feat_max_device"),
      ],
      callout: null,
      details: t("pricing.normal_details"),
    },
    {
      id: "vip",
      name: t("pricing.vip_name"),
      price: "Rp 30.000",
      duration: t("pricing.per_duration"),
      badge: t("pricing.vip_badge"),
      icon: Crown,
      description: t("pricing.vip_desc"),
      features: [
        t("pricing.feat_all_normal"),
        t("pricing.feat_ai_priority"),
        t("pricing.feat_vip_badge"),
        t("pricing.feat_fast_support"),
        t("pricing.feat_upcoming"),
      ],
      callout: null,
      details: t("pricing.vip_details"),
    },
  ];

  return (
    <section className="relative px-4 py-16 sm:py-20">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-20 right-1/4 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {t("pricing.title")}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
          {t("pricing.subtitle")}
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:gap-5 sm:grid-cols-3">
          {PACKAGES.map((pkg) => {
            const isSelected = selectedPkg === pkg.id;

            return (
              <motion.div
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg.id)}
                className={`relative cursor-pointer rounded-2xl border p-4 sm:p-6 h-full flex flex-col transition-colors duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-primary/20"
                }`}
                animate={{
                  scale: isSelected ? 1.02 : 1,
                  y: isSelected ? -4 : 0,
                }}
                transition={springSmooth}
                whileHover={!isSelected ? { scale: 1.01, y: -2 } : undefined}
              >
                {/* Selection ring */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl ring-2 ring-primary/30 pointer-events-none"
                    layoutId="pricing-ring"
                    transition={springSmooth}
                  />
                )}

                <div className="flex items-center gap-2 mb-3">
                  <pkg.icon
                    className={`h-5 w-5 transition-colors ${
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {pkg.badge}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-bold">{pkg.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pkg.description}
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-bold text-foreground">
                    {pkg.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {pkg.duration}
                  </span>
                </div>

                {/* Share requirement callout - hidden behind "Selengkapnya" */}
                {pkg.callout && (
                  <details className="mt-3 group/details">
                    <summary className="text-xs text-muted-foreground underline cursor-pointer hover:text-foreground transition-colors list-none">
                      {t("pricing.more_info")}
                    </summary>
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          {pkg.callout}
                        </p>
                        <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                          {pkg.details}
                        </p>
                      </div>
                    </div>
                  </details>
                )}

                <ul className="mt-4 space-y-2 flex-1">
                  {pkg.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* Non-share package details footnote */}
                {!pkg.callout && pkg.details && (
                  <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
                    {pkg.details}
                  </p>
                )}

                {/* Buy button - only on selected */}
                <AnimatePresence mode="wait">
                  {isSelected ? (
                    <motion.a
                      key="buy"
                      href={PURCHASE_FORM_URL || "#"}
                      target={PURCHASE_FORM_URL ? "_blank" : undefined}
                      rel={
                        PURCHASE_FORM_URL ? "noopener noreferrer" : undefined
                      }
                      className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg h-11 text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 ${
                        !PURCHASE_FORM_URL
                          ? "cursor-not-allowed opacity-60"
                          : ""
                      }`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t("pricing.buy")}
                    </motion.a>
                  ) : (
                    <motion.button
                      key="select"
                      className="mt-5 inline-flex w-full items-center justify-center rounded-lg h-11 text-sm font-medium transition-colors border border-border bg-background hover:bg-muted cursor-pointer"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPkg(pkg.id);
                      }}
                    >
                      {t("pricing.select")}
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
