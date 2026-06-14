"use client";

import { useMemo, useState } from "react";
import { Pin, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/providers/language-provider";
import type { SupportMessage, SupportPinnedMessage } from "@/types";

interface Props {
  pins: SupportPinnedMessage[];
  messages: SupportMessage[];
  isAdmin: boolean;
  onUnpin: (messageId: string) => void;
  onJump: (messageId: string) => void;
}

/**
 * Sticky bar at the top of the message list that shows pinned messages.
 * Collapsed by default to one preview; expand to see all (max 3).
 */
export function SupportPinnedBar({
  pins,
  messages,
  isAdmin,
  onUnpin,
  onJump,
}: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const enriched = useMemo(() => {
    const byId = new Map(messages.map((m) => [m.id, m]));
    return pins
      .map((p) => ({ pin: p, msg: byId.get(p.messageId) }))
      .filter((x): x is { pin: SupportPinnedMessage; msg: SupportMessage } =>
        Boolean(x.msg && !x.msg.deleted)
      );
  }, [pins, messages]);

  if (enriched.length === 0) return null;

  const visible = expanded ? enriched : enriched.slice(0, 1);

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-2 py-1 backdrop-blur-sm">
      <div className="flex items-start gap-1">
        <Pin className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
        <div className="flex-1 space-y-0.5">
          {visible.map(({ pin, msg }) => {
            const preview =
              msg.type === "image"
                ? `[${t("support.image_label")}]`
                : msg.type === "audio"
                  ? `[${t("support.audio_label")}]`
                  : msg.content;
            return (
              <div
                key={pin.id}
                role="button"
                tabIndex={0}
                onClick={() => onJump(pin.messageId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onJump(pin.messageId);
                  }
                }}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-left text-[11px] transition-colors hover:bg-muted/50"
              >
                <span className="truncate font-medium text-foreground/90">
                  {msg.senderName}:
                </span>
                <span className="truncate text-muted-foreground">
                  {preview.slice(0, 80)}
                </span>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpin(pin.messageId);
                    }}
                    className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={t("support.unpin_message")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {enriched.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
      {!expanded && enriched.length > 1 && (
        <p className="ml-4 text-[9px] text-muted-foreground/70">
          +{enriched.length - 1}{" "}
          {enriched.length - 1 === 1 ? "pesan" : "pesan"} ter-pin
        </p>
      )}
    </div>
  );
}
