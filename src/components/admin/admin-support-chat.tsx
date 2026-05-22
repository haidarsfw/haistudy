"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Bell, BellOff, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_COLORS, resolveRole } from "@/lib/role-colors";
import { sounds } from "@/lib/sounds";
import { useSupportConversations } from "@/hooks/use-support-conversations";
import { useSupportPresence } from "@/hooks/use-support-presence";
import { useSupportMutes } from "@/hooks/use-support-mutes";
import { SupportConversationList } from "@/components/support/support-conversation-list";
import { SupportChatThread } from "@/components/support/support-chat-thread";
import { SupportPresenceBadge } from "@/components/support/support-presence-badge";
import { useAdminScope } from "@/components/providers/admin-scope-provider";

export function AdminSupportChat() {
  const { adminScope, isAllPeriods } = useAdminScope();
  // Thread admin's scope context into support conversations hook:
  // - "all" mode → cross-scope inbox
  // - scoped → only conversations from that scope
  const { conversations, loading, resolveConversation } = useSupportConversations({
    allPeriods: isAllPeriods || adminScope === "all",
    scopeOverride: adminScope === "all" ? undefined : adminScope,
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const searchParams = useSearchParams();
  // Track presence of the selected user — admin always sees a "user" presence
  const { presence } = useSupportPresence(selectedKey, "user");
  const { isMuted, toggle: toggleMute } = useSupportMutes();
  const muted = selectedKey ? isMuted(selectedKey) : false;

  // Deep-link from web push: /admin?tab=7&lk=KEY auto-selects the conversation.
  useEffect(() => {
    const lk = searchParams.get("lk");
    if (lk && lk !== selectedKey) setSelectedKey(lk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
                  {selectedKey && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        sounds.click();
                        toggleMute(selectedKey);
                      }}
                      aria-label={muted ? "Unmute" : "Mute"}
                      title={muted ? "Unmute conversation" : "Mute conversation"}
                    >
                      {muted ? (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                    </Button>
                  )}
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
