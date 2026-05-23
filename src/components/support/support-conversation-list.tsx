"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Loader2, MessageCircle, Search } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { ROLE_COLORS, resolveRole } from "@/lib/role-colors";
import { sounds } from "@/lib/sounds";
import type { SupportConversationSummary } from "@/types";

interface Props {
  conversations: SupportConversationSummary[];
  selectedKey: string | null;
  onSelect: (licenseKey: string) => void;
  loading?: boolean;
}

export function SupportConversationList({
  conversations,
  selectedKey,
  onSelect,
  loading,
}: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const filtered = search
    ? conversations.filter(
        (c) =>
          c.userName.toLowerCase().includes(search.toLowerCase()) ||
          c.licenseKey.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const unresolvedCount = conversations.filter((c) => !c.isResolved).length;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-border p-3 shrink-0">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircle className="h-4 w-4 text-primary" />
          Support Chats
          {unresolvedCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unresolvedCount}
            </span>
          )}
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("support.placeholder").startsWith("Tulis") ? "Cari user..." : "Search user..."}
            className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Belum ada percakapan support
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = selectedKey === conv.licenseKey;
            const role = resolveRole({
              isAdmin: conv.isAdmin ?? false,
              isTester: conv.isTester ?? false,
              packageTier: conv.packageTier ?? null,
            });
            return (
              <button
                key={conv.licenseKey}
                onClick={() => {
                  sounds.click();
                  onSelect(conv.licenseKey);
                }}
                className={`flex w-full items-start gap-3 border-b border-border/50 px-3 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-l-2 border-l-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {conv.userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`truncate text-xs font-semibold ${ROLE_COLORS[role].text}`}
                    >
                      {conv.userName}
                    </span>
                    {conv.isResolved && (
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {conv.lastMessage}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground/60" aria-hidden="true" />
                    <span className="text-[9px] text-muted-foreground/70">
                      {new Date(conv.lastTime).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!conv.isResolved && conv.unreadCount > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
