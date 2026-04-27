"use client";

import { CheckCircle2 } from "lucide-react";
import { AudioPlayer } from "@/components/chat/audio-player";
import { useTranslation } from "@/components/providers/language-provider";
import type { SupportMessage } from "@/types";

interface Props {
  message: SupportMessage;
  /** Click handler for image (lightbox open). */
  onImageClick?: (url: string) => void;
}

type Resolved =
  | { kind: "system"; text: string }
  | { kind: "image"; url: string; caption: string }
  | { kind: "audio"; url: string }
  | { kind: "text"; text: string };

/**
 * Backwards-compat detection cascade:
 *   1) is_system or type='system' → system chip
 *   2) type='audio' + media_url    → audio player
 *   3) type='image' + media_url    → image (caption from content)
 *   4) type='text' + content '[image]' prefix → legacy fallback parse
 *   5) plain text
 */
function resolve(m: SupportMessage): Resolved {
  if (m.isSystem || m.type === "system") {
    return { kind: "system", text: m.content };
  }
  if (m.type === "audio" && m.mediaUrl) {
    return { kind: "audio", url: m.mediaUrl };
  }
  if (m.type === "image" && m.mediaUrl) {
    return { kind: "image", url: m.mediaUrl, caption: m.content || "" };
  }
  if (m.type === "text" && m.content.startsWith("[image]")) {
    const lines = m.content.split("\n");
    const url = lines[0].slice(7);
    const caption = lines.slice(1).join("\n");
    return { kind: "image", url, caption };
  }
  return { kind: "text", text: m.content };
}

export function SupportMessageContent({ message, onImageClick }: Props) {
  const { t } = useTranslation();
  if (message.deleted) {
    return (
      <p className="text-xs italic text-muted-foreground">
        {t("support.message_deleted")}
      </p>
    );
  }

  const r = resolve(message);

  if (r.kind === "system") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        {r.text}
      </div>
    );
  }

  if (r.kind === "audio") {
    return <AudioPlayer src={r.url} />;
  }

  if (r.kind === "image") {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => onImageClick?.(r.url)}
          className="block cursor-zoom-in"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.url}
            alt=""
            className="max-h-60 max-w-[260px] rounded-lg border border-border object-cover"
            loading="lazy"
          />
        </button>
        {r.caption && (
          <p className="break-words whitespace-pre-wrap text-xs">{r.caption}</p>
        )}
      </div>
    );
  }

  return (
    <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">
      {r.text}
    </p>
  );
}
