"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Plus, ArrowLeft, Send, Crown, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { useDmChat } from "@/hooks/use-dm-chat";
import { generateDefaultAvatar } from "@/lib/avatar";
import { DmUserPicker } from "./dm-user-picker";
import { sounds } from "@/lib/sounds";
import { toast } from "@/components/ui/toast";

type View = "list" | "picker" | "thread";

interface DmTabProps {
  pendingDmKey?: string | null;
  onDmKeyConsumed?: () => void;
}

export function DmTab({ pendingDmKey, onDmKeyConsumed }: DmTabProps = {}) {
  const { t } = useTranslation();
  const {
    myKey,
    directory,
    conversations,
    activeId,
    setActiveId,
    messages,
    isLoadingDirectory,
    isLoadingMessages,
    isSending,
    fetchDirectory,
    openConversationWith,
    sendMessage,
  } = useDmChat();

  const [view, setView] = useState<View>("list");
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeId);

  // Auto-scroll to newest message in the open thread.
  useEffect(() => {
    if (view === "thread") {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view]);

  const openPicker = () => {
    sounds.click();
    fetchDirectory();
    setView("picker");
  };

  const handlePick = async (licenseKey: string) => {
    const id = await openConversationWith(licenseKey);
    if (id) {
      setView("thread");
    } else {
      toast.error(t("dm.vip_only"));
    }
  };

  // Issue 4d: open a thread directly when the profile popover requests a DM.
  // Consume once so re-renders don't re-trigger; guard against double-fire.
  const consumedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingDmKey || consumedKeyRef.current === pendingDmKey) return;
    consumedKeyRef.current = pendingDmKey;
    const key = pendingDmKey.toUpperCase();
    (async () => {
      const id = await openConversationWith(key);
      if (id) setView("thread");
      else toast.error(t("dm.vip_only"));
      onDmKeyConsumed?.();
    })();
  }, [pendingDmKey, openConversationWith, onDmKeyConsumed, t]);

  const openThread = (id: string) => {
    sounds.click();
    setActiveId(id);
    setView("thread");
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    try {
      await sendMessage(body);
    } catch (error) {
      setDraft(body);
      toast.error(error instanceof Error ? error.message : "Gagal mengirim pesan");
    }
  };

  // ── Picker view ──
  if (view === "picker") {
    return (
      <DmUserPicker
        directory={directory}
        isLoading={isLoadingDirectory}
        onPick={handlePick}
        onBack={() => setView("list")}
      />
    );
  }

  // ── Thread view ──
  if (view === "thread" && activeConv) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Thread header */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button
            onClick={() => { sounds.click(); setView("list"); }}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Image
            src={generateDefaultAvatar(activeConv.otherName, 64)}
            alt={activeConv.otherName ?? ""}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">
                {activeConv.otherName ?? t("dm.you")}
              </span>
              {activeConv.otherIsAdmin ? (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              ) : (
                <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {activeConv.otherOnline ? t("dm.online") : t("dm.offline")}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {isLoadingMessages ? (
            <div className="flex flex-col gap-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`skeleton h-9 ${i % 2 ? "ml-auto w-2/3" : "w-1/2"} !rounded-2xl`}
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("dm.start_conversation")}
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.senderKey.toUpperCase() === myKey;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="flex items-end gap-2 border-t border-border p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder={t("dm.placeholder")}
            className="max-h-28 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !draft.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            aria-label={t("dm.send")}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── List view (default) ──
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold">{t("dm.title")}</span>
        <button
          onClick={openPicker}
          className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground"
        >
          <Plus className="h-3 w-3" />
          {t("dm.new")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t("dm.no_conversations")}</p>
            <p className="text-xs text-muted-foreground">{t("dm.empty_hint")}</p>
          </div>
        ) : (
          <ul className="py-1">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => openThread(c.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <div className="relative shrink-0">
                    <Image
                      src={generateDefaultAvatar(c.otherName, 72)}
                      alt={c.otherName ?? ""}
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full"
                      unoptimized
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                        c.otherOnline ? "bg-emerald-500" : "bg-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="truncate text-sm font-medium">
                      {c.otherName ?? t("dm.you")}
                    </span>
                    {c.lastBody && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.lastBody}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
