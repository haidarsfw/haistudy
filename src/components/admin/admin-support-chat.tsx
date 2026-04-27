"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_COLORS, resolveRole } from "@/lib/role-colors";
import { sounds } from "@/lib/sounds";
import { useSupportConversations } from "@/hooks/use-support-conversations";
import { useSupportPresence } from "@/hooks/use-support-presence";
import { SupportConversationList } from "@/components/support/support-conversation-list";
import { SupportChatThread } from "@/components/support/support-chat-thread";
import { SupportPresenceBadge } from "@/components/support/support-presence-badge";

export function AdminSupportChat() {
  const { conversations, loading, resolveConversation } = useSupportConversations();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Track presence of the selected user — admin always sees a "user" presence
  const { presence } = useSupportPresence(selectedKey, "user");

  const selectedConv = useMemo(
    () => conversations.find((c) => c.licenseKey === selectedKey) ?? null,
    [conversations, selectedKey]
  );

  const handleResolve = async () => {
    if (!selectedKey) return;
    sounds.click();
    await resolveConversation(selectedKey);
  };

  const role = selectedConv
    ? resolveRole({
        isAdmin: selectedConv.isAdmin ?? false,
        isTester: selectedConv.isTester ?? false,
        packageTier: selectedConv.packageTier ?? null,
      })
    : "normal";

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card"
      style={{ height: "min(75vh, 700px)" }}
    >
      <div className="flex h-full">
        {/* Left: list — full width on mobile when no selection, fixed sidebar on desktop */}
        <div
          className={`${
            selectedKey ? "hidden sm:flex" : "flex"
          } w-full shrink-0 flex-col border-r border-border sm:w-80`}
        >
          <SupportConversationList
            conversations={conversations}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            loading={loading}
          />
        </div>

        {/* Right: thread — full width on mobile when selected, flex-1 on desktop */}
        <div
          className={`${
            selectedKey ? "flex" : "hidden sm:flex"
          } min-w-0 flex-1 flex-col`}
        >
          {!selectedKey ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="space-y-2 text-center">
                <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">
                  Pilih percakapan untuk mulai membalas
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header with presence */}
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  {/* Mobile back button */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSelectedKey(null)}
                    className="sm:hidden"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {selectedConv?.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-semibold ${ROLE_COLORS[role].text}`}
                    >
                      {selectedConv?.userName}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate text-[10px] text-muted-foreground">
                        {selectedKey?.slice(0, 12)}…
                      </span>
                      <SupportPresenceBadge presence={presence} />
                      {selectedConv?.isResolved && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!selectedConv?.isResolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResolve}
                      className="h-7 gap-1 border-emerald-500/30 text-[11px] text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <SupportChatThread
                  mode="admin"
                  licenseKey={selectedKey}
                  ownerSummary={selectedConv}
                  visible
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
