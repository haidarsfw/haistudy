"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  CheckCheck,
  Pencil,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/providers/language-provider";
import type {
  SupportMessage,
  SupportReaction,
  SupportReadReceipt,
} from "@/types";

interface Props {
  open: boolean;
  message: SupportMessage | null;
  reactions: SupportReaction[];
  receipts: SupportReadReceipt[];
  onClose: () => void;
}

function formatFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatRelative(fromIso: string, toIso: string): string {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}j`;
  return `${Math.round(ms / 86_400_000)}h`;
}

/**
 * Bottom-sheet (mobile) / centered modal (desktop) with full message metadata:
 * sent timestamp, edit history, read receipts, and reactor list grouped by emoji.
 */
export function SupportMessageInfo({
  open,
  message,
  reactions,
  receipts,
  onClose,
}: Props) {
  const { t } = useTranslation();

  const reactionsByEmoji = useMemo(() => {
    const map = new Map<string, SupportReaction[]>();
    for (const r of reactions) {
      const list = map.get(r.emoji) ?? [];
      list.push(r);
      map.set(r.emoji, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [reactions]);

  const receiptByKind = useMemo(() => {
    const out: Record<string, SupportReadReceipt | undefined> = {};
    for (const r of receipts) out[r.readerKind] = r;
    return out;
  }, [receipts]);

  return (
    <AnimatePresence>
      {open && message && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[121] mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-background shadow-2xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">
                {t("support.message_info")}
              </h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label={t("support.lightbox_close")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm">
              {/* Content snippet */}
              {message.content && (
                <div className="rounded-md bg-muted/50 p-2 text-xs">
                  <p className="break-words line-clamp-4 italic text-muted-foreground">
                    {message.content.slice(0, 200)}
                    {message.content.length > 200 ? "…" : ""}
                  </p>
                </div>
              )}

              {/* Sent */}
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("support.info_sent")}
                  </p>
                  <p className="font-mono text-[11px]">
                    {formatFull(message.createdAt)}
                  </p>
                </div>
              </div>

              {/* Edited */}
              {message.editedAt && (
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("support.info_edited")}
                    </p>
                    <p className="font-mono text-[11px]">
                      {formatFull(message.editedAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Unsent */}
              {message.deleted && message.unsentAt && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-destructive">
                      {t("support.unsent_by_admin")}
                    </p>
                    <p className="font-mono text-[11px]">
                      {formatFull(message.unsentAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Read receipts */}
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  {t("support.info_read")}
                </p>
                {(["user", "admin"] as const).map((kind) => {
                  const r = receiptByKind[kind];
                  if (!r) return null;
                  return (
                    <div
                      key={kind}
                      className="flex items-center gap-2 py-1"
                    >
                      <CheckCheck className="h-4 w-4 text-sky-400" />
                      <span className="flex-1 text-xs capitalize">{kind}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatFull(r.readAt)} · +
                        {formatRelative(message.createdAt, r.readAt)}
                      </span>
                    </div>
                  );
                })}
                {!receiptByKind.user && !receiptByKind.admin && (
                  <p className="text-xs italic text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" />
                    Belum dibaca
                  </p>
                )}
              </div>

              {/* Reactions */}
              {reactionsByEmoji.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    {t("support.info_reactions")}
                  </p>
                  <div className="space-y-2">
                    {reactionsByEmoji.map(([emoji, list]) => (
                      <div key={emoji} className="flex items-start gap-2">
                        <span className="text-lg leading-none">{emoji}</span>
                        <span className="flex-1 text-xs text-muted-foreground">
                          {list
                            .map((r) => r.reactorName)
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                        <span className="text-xs font-medium">
                          {list.length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
