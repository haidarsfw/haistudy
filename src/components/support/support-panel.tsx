"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  LifeBuoy,
  MessageCircle,
  ChevronDown,
  Bug,
  Bell,
  BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { useSupportPresence } from "@/hooks/use-support-presence";
import { useSupportMutes } from "@/hooks/use-support-mutes";
import { sounds } from "@/lib/sounds";
import { SupportChatThread } from "./support-chat-thread";
import { SupportPresenceBadge } from "./support-presence-badge";

const FAQ_KEYS = [
  { q: "support.faq_1_q", a: "support.faq_1_a" },
  { q: "support.faq_2_q", a: "support.faq_2_a" },
  { q: "support.faq_3_q", a: "support.faq_3_a" },
  { q: "support.faq_4_q", a: "support.faq_4_a" },
  { q: "support.faq_5_q", a: "support.faq_5_a" },
  { q: "support.faq_6_q", a: "support.faq_6_a" },
];

interface SupportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportPanel({ isOpen, onClose }: SupportPanelProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<"help" | "chat">("chat");
  // For user panel, presence target is "any admin" - pass null to the hook.
  const { presence: adminPresence } = useSupportPresence(null, "admin");
  const { isMuted, toggle: toggleMute } = useSupportMutes();
  const ownLk = session?.licenseKey ?? "";
  const muted = ownLk ? isMuted(ownLk) : false;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrops */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 sm:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 hidden bg-black/20 sm:block"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] w-full flex-col rounded-t-2xl border-t border-border bg-background shadow-xl sm:inset-x-auto sm:top-14 sm:bottom-0 sm:right-0 sm:h-auto sm:max-h-none sm:w-96 sm:rounded-none sm:border-l sm:border-t-0"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <LifeBuoy className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <h2 className="font-heading text-sm font-bold leading-tight">
                    {t("support.title")}
                  </h2>
                  {activeTab === "chat" && (
                    <SupportPresenceBadge
                      presence={adminPresence}
                      className="mt-0.5"
                    />
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {ownLk && activeTab === "chat" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      sounds.click();
                      toggleMute(ownLk);
                    }}
                    aria-label={muted ? t("support.unmute") : t("support.mute")}
                    title={muted ? t("support.unmute") : t("support.mute")}
                  >
                    {muted ? (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0 border-b border-border">
              <button
                onClick={() => {
                  sounds.click();
                  setActiveTab("help");
                }}
                className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "help"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("support.tab_help")}
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  setActiveTab("chat");
                }}
                className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "chat"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("support.tab_chat")}
              </button>
            </div>

            {activeTab === "help" ? (
              /* ===== Help Tab ===== */
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("support.quick_links")}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        window.open("https://wa.me/6287839256171", "_blank")
                      }
                      className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-left transition-colors hover:bg-emerald-500/10"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">WhatsApp</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t("support.whatsapp")}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        window.open("https://instagram.com/haidarsfw", "_blank")
                      }
                      className="flex items-center gap-2.5 rounded-xl border border-pink-500/30 bg-pink-500/5 px-3 py-2.5 text-left transition-colors hover:bg-pink-500/10"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Instagram</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t("support.instagram")}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("support.faq_title")}
                  </h3>
                  <div className="space-y-2">
                    {FAQ_KEYS.map((item, i) => (
                      <details
                        key={i}
                        className="group overflow-hidden rounded-lg border border-border"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                          <span>{t(item.q)}</span>
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="border-t border-border bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                          {t(item.a)}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("support.help_links")}
                  </h3>
                  <button
                    onClick={() => {
                      onClose();
                      router.push("/feedback?category=bug");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <Bug className="h-4 w-4 shrink-0 text-destructive" />
                    <div>
                      <p className="text-xs font-medium">
                        {t("support.report_bug")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t("support.report_bug_desc")}
                      </p>
                    </div>
                  </button>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    {t("support.help_footer")}
                  </p>
                </div>
              </div>
            ) : (
              /* ===== Chat Tab - v2 thread ===== */
              <div className="flex min-h-0 flex-1 flex-col">
                <SupportChatThread
                  mode="user"
                  licenseKey={session?.licenseKey ?? null}
                  visible={isOpen}
                  emptyState={
                    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                      <MessageCircle className="h-10 w-10 text-primary/30" />
                      <h3 className="text-sm font-semibold">
                        {t("support.chat_welcome_title")}
                      </h3>
                      <p className="max-w-[260px] text-xs leading-relaxed text-muted-foreground">
                        {t("support.chat_welcome_desc")}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">
                        {t("support.chat_faster_note")}
                      </p>
                    </div>
                  }
                />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
