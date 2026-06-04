"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useProfile } from "@/hooks/use-profile";
import { useTranslation } from "@/components/providers/language-provider";
import { PostTutorialContact } from "./post-tutorial-contact";
import { PostTutorialSettings } from "./post-tutorial-settings";
import { springSmooth } from "@/lib/motion";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingOverlay() {
  const { shouldShow, currentStep, step, totalSteps, isMobile, next, prev, postPhase, advancePostPhase } =
    useOnboarding();
  const { t } = useTranslation();
  const { profile, loading: profileLoading } = useProfile();
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lock scroll during tutorial
  useEffect(() => {
    if (!shouldShow) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [shouldShow]);

  // Resolve the correct target selector based on mobile state
  const resolvedTarget = (() => {
    if (!step) return null;
    if (isMobile && step.mobileTarget !== undefined) return step.mobileTarget;
    return step.target;
  })();

  // Find and measure target element
  useEffect(() => {
    if (!shouldShow || !resolvedTarget) {
      setSpotlight(null);
      return;
    }

    const findTarget = () => {
      const el = document.querySelector(resolvedTarget);
      if (el) {
        const rect = el.getBoundingClientRect();
        const padding = 8;
        setSpotlight({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
      } else {
        setSpotlight(null);
      }
    };

    const timer = setTimeout(findTarget, 100);

    window.addEventListener("resize", findTarget);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", findTarget);
    };
  }, [shouldShow, resolvedTarget]);

  // Auto-skip the post-tutorial contact modal when both phone & email are
  // already linked to the account (propagated from the purchase at approval).
  useEffect(() => {
    if (
      !shouldShow &&
      postPhase === "contact-form" &&
      !profileLoading &&
      profile.phone &&
      profile.email
    ) {
      advancePostPhase();
    }
  }, [shouldShow, postPhase, profileLoading, profile.phone, profile.email, advancePostPhase]);

  // Render post-tutorial phases
  if (!shouldShow && postPhase === "contact-form") {
    // Contact already on file → don't show the modal (the effect above advances
    // the phase). While the profile is still loading, render nothing to avoid a
    // flash of the form before we know whether to skip it.
    if (profileLoading) return null;
    if (profile.phone && profile.email) return null;
    return (
      <PostTutorialContact
        onDone={advancePostPhase}
        initialPhone={profile.phone ?? ""}
        initialEmail={profile.email ?? ""}
      />
    );
  }
  if (!shouldShow && postPhase === "settings-setup") {
    return <PostTutorialSettings onDone={advancePostPhase} />;
  }

  if (!shouldShow || !step) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isCentered = !resolvedTarget || !spotlight;

  // Calculate tooltip position relative to spotlight
  const getTooltipStyle = (): React.CSSProperties => {
    const viewW = typeof window !== "undefined" ? window.innerWidth : 375;
    const viewH = typeof window !== "undefined" ? window.innerHeight : 700;
    const isMobileView = viewW < 640;
    const tooltipWidth = isMobileView ? Math.min(280, viewW - 24) : Math.min(320, viewW - 32);
    const tooltipHeight = 220;

    if (isCentered) {
      return {
        position: "fixed",
        top: Math.max(16, (viewH - tooltipHeight) / 2),
        left: Math.max(12, (viewW - tooltipWidth) / 2),
      };
    }

    const s = spotlight!;
    const gap = 12;

    let top = s.top + s.height + gap;
    let left = s.left + s.width / 2 - tooltipWidth / 2;

    if (top + tooltipHeight > viewH - 20) {
      top = s.top - tooltipHeight - gap;
    }

    if (left < 12) left = 12;
    if (left + tooltipWidth > viewW - 12) left = viewW - tooltipWidth - 12;

    // Clamp top within viewport
    if (top < 16) top = 16;
    if (top + tooltipHeight > viewH - 16) top = viewH - tooltipHeight - 16;

    return { position: "fixed", top, left };
  };

  return (
    <AnimatePresence>
      <div ref={containerRef} className="fixed inset-0 z-[100] pointer-events-none">
        {/* Backdrop with spotlight hole */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[1] pointer-events-auto"
          style={{
            background: isCentered ? "rgba(0,0,0,0.7)" : undefined,
            ...(spotlight && !isCentered
              ? {
                  boxShadow: `
                    0 0 0 9999px rgba(0,0,0,0.65),
                    inset 0 0 0 0 rgba(0,0,0,0)
                  `,
                  clipPath: `polygon(
                    0% 0%, 0% 100%,
                    ${spotlight.left}px 100%,
                    ${spotlight.left}px ${spotlight.top}px,
                    ${spotlight.left + spotlight.width}px ${spotlight.top}px,
                    ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px,
                    ${spotlight.left}px ${spotlight.top + spotlight.height}px,
                    ${spotlight.left}px 100%,
                    100% 100%, 100% 0%
                  )`,
                  backgroundColor: "rgba(0,0,0,0.65)",
                }
              : {}),
          }}
          onClick={() => {}}
        />

        {/* Spotlight border glow */}
        {spotlight && !isCentered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springSmooth}
            className="absolute rounded-xl border-2 border-primary/50 pointer-events-none"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
            }}
          />
        )}

        {/* Tooltip card */}
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springSmooth}
          style={getTooltipStyle()}
          className="w-[280px] sm:w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xl pointer-events-auto z-[5]"
        >
          <div className="space-y-3">
            {/* Step counter */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? "w-6 bg-primary"
                      : i < currentStep
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <h3 className="font-heading text-lg font-bold">{t(step.titleKey)}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(step.descriptionKey)}
            </p>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={prev}
                  style={{ touchAction: "manipulation" }}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted cursor-pointer"
                >
                  {t("onboarding.prev")}
                </button>
              )}
              <button
                onClick={next}
                style={{ touchAction: "manipulation" }}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
              >
                {isLastStep ? t("onboarding.finish") : t("onboarding.next")}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
