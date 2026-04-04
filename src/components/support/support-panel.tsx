"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, LifeBuoy, MessageCircle, Loader2, ImagePlus, ChevronDown, BookOpen, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { useSupportChat } from "@/hooks/use-support-chat";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { sounds } from "@/lib/sounds";

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
  const { messages, loading, sendMessage } = useSupportChat();
  const { isPreview, guard } = usePreviewGuard();
  const [activeTab, setActiveTab] = useState<"help" | "chat">("chat");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Scroll to bottom when panel opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight;
      });
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!guard("preview.chat_blocked")) return;
    if ((!input.trim() && !imageFile) || sending) return;
    setSending(true);
    sounds.send();

    let content = input.trim();
    if (imageFile) {
      const url = await uploadToCloudinary(imageFile);
      if (url) {
        content = content ? `[image]${url}\n${content}` : `[image]${url}`;
      }
    }

    await sendMessage(content);
    setInput("");
    setImageFile(null);
    setImagePreview(null);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 5 * 1024 * 1024) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file || file.size > 5 * 1024 * 1024) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        return;
      }
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 sm:hidden"
            onClick={onClose}
          />

          {/* Desktop backdrop */}
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
            className="fixed right-0 bottom-0 z-50 flex w-full flex-col border-t border-border bg-background shadow-xl max-h-[calc(100dvh-3.5rem)] rounded-t-2xl sm:top-14 sm:bottom-0 sm:right-0 sm:h-auto sm:w-96 sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-sm font-bold">{t("support.title")}</h2>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              <button
                onClick={() => { sounds.click(); setActiveTab("help"); }}
                className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "help"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("support.tab_help")}
              </button>
              <button
                onClick={() => { sounds.click(); setActiveTab("chat"); }}
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
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
                {/* Quick contacts */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {t("support.quick_links")}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => window.open("https://wa.me/6287839256171", "_blank")}
                      className="flex items-center gap-2.5 rounded-xl border border-green-500/30 bg-green-500/5 px-3 py-2.5 text-left transition-colors hover:bg-green-500/10"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">WhatsApp</p>
                        <p className="text-[10px] text-muted-foreground">{t("support.whatsapp")}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => window.open("https://instagram.com/haidarsfw", "_blank")}
                      className="flex items-center gap-2.5 rounded-xl border border-pink-500/30 bg-pink-500/5 px-3 py-2.5 text-left transition-colors hover:bg-pink-500/10"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Instagram</p>
                        <p className="text-[10px] text-muted-foreground">{t("support.instagram")}</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* FAQ */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {t("support.faq_title")}
                  </h3>
                  <div className="space-y-2">
                    {FAQ_KEYS.map((item, i) => (
                      <details key={i} className="group rounded-lg border border-border overflow-hidden">
                        <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-xs font-medium hover:bg-muted/50 transition-colors [&::-webkit-details-marker]:hidden list-none">
                          <span>{t(item.q)}</span>
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="border-t border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                          {t(item.a)}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>

                {/* Help links */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("support.help_links")}
                  </h3>
                  <button
                    onClick={() => { onClose(); router.push("/feedback?category=bug"); }}
                    className="flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <Bug className="h-4 w-4 text-destructive shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{t("support.report_bug")}</p>
                      <p className="text-[10px] text-muted-foreground">{t("support.report_bug_desc")}</p>
                    </div>
                  </button>
                </div>

                {/* Footer note */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {t("support.help_footer")}
                  </p>
                </div>
              </div>
            ) : (
              /* ===== Chat Tab ===== */
              <>
                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div ref={scrollRef} className="p-4 space-y-3">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-8 text-center px-4">
                        <MessageCircle className="h-10 w-10 text-primary/30" />
                        <h3 className="text-sm font-semibold">{t("support.chat_welcome_title")}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
                          {t("support.chat_welcome_desc")}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {t("support.chat_faster_note")}
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        // System message (e.g. resolved)
                        if (msg.is_system) {
                          return (
                            <div key={msg.id} className="flex justify-center">
                              <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1.5 text-[10px] text-green-600 dark:text-green-400 font-medium">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {msg.content}
                              </div>
                            </div>
                          );
                        }

                        const isOwn = msg.sender_name === session?.name && !msg.is_admin;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                                msg.is_admin
                                  ? "bg-primary/10 text-foreground border border-primary/20"
                                  : isOwn
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
                              }`}
                            >
                              {!isOwn && (
                                <p className={`text-[10px] font-semibold mb-0.5 ${msg.is_admin ? "text-primary" : "text-muted-foreground"}`}>
                                  {msg.sender_name}{msg.is_admin ? " (Admin)" : ""}
                                </p>
                              )}
                              {msg.content.startsWith("[image]") ? (
                                <>
                                  <img
                                    src={msg.content.split("\n")[0].slice(7)}
                                    alt="Shared"
                                    className="max-h-48 rounded-lg mb-1"
                                    loading="lazy"
                                  />
                                  {msg.content.includes("\n") && (
                                    <p className="break-words whitespace-pre-wrap">
                                      {msg.content.split("\n").slice(1).join("\n")}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                              )}
                              <p className={`text-[9px] mt-0.5 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
                  {imagePreview && (
                    <div className="relative inline-block mb-2">
                      <img src={imagePreview} alt="Preview" className="h-16 w-auto rounded-lg object-cover" />
                      <button
                        onClick={removeImage}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      placeholder={t("support.placeholder")}
                      maxLength={2000}
                      className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={(!input.trim() && !imageFile) || sending}
                      className="h-9 w-9 shrink-0"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
