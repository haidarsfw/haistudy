"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  X,
  ImagePlus,
  Smile,
  Mic,
  Loader2,
  Trash2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "@/components/providers/language-provider";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { sounds } from "@/lib/sounds";
import { SUPPORT_MAX_IMAGES } from "@/lib/constants";
import type { SupportMessage } from "@/types";
import { SupportEmojiPicker } from "./support-emoji-picker";
import { SupportDragDropOverlay } from "./support-drag-drop-overlay";

interface Props {
  /** Stable conversation key (drives drag-drop reset). */
  licenseKey: string | null;
  disabled?: boolean;
  replyTo: SupportMessage | null;
  onCancelReply: () => void;
  editTarget: SupportMessage | null;
  onCancelEdit: () => void;
  onSendText: (
    content: string,
    opts?: { replyTo?: { id: string; name: string; content: string } | null }
  ) => Promise<unknown>;
  onSendImage: (
    url: string,
    caption: string,
    opts?: { replyTo?: { id: string; name: string; content: string } | null }
  ) => Promise<unknown>;
  onSendAudio: (
    url: string,
    opts?: { replyTo?: { id: string; name: string; content: string } | null }
  ) => Promise<unknown>;
  onSubmitEdit: (id: string, content: string) => Promise<{ ok: boolean; error?: string; code?: string }>;
  onTyping: () => void;
  /** Container ref for drag-drop overlay attach. */
  dropContainerRef: React.RefObject<HTMLElement | null>;
  /** Mobile bottom-sheet width hint. Defaults to 384. */
  isMobile?: boolean;
}

interface PendingImage {
  file: File;
  preview: string;
}

export function SupportMessageInput({
  licenseKey,
  disabled,
  replyTo,
  onCancelReply,
  editTarget,
  onCancelEdit,
  onSendText,
  onSendImage,
  onSendAudio,
  onSubmitEdit,
  onTyping,
  dropContainerRef,
  isMobile = false,
}: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Voice recorder (hold-to-record) ──
  const recorder = useAudioRecorder();
  const [recState, setRecState] = useState<"idle" | "recording" | "locked">("idle");
  const recPointerRef = useRef<{ x: number; y: number } | null>(null);
  const cancelledRef = useRef(false);

  /* ── Sync edit target into input ── */
  useEffect(() => {
    if (editTarget) {
      setText(editTarget.content);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [editTarget]);

  /* ── Auto-grow textarea ── */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  /* ── Reset state when conversation changes ── */
  useEffect(() => {
    setText("");
    setImages((cur) => {
      cur.forEach((i) => URL.revokeObjectURL(i.preview));
      return [];
    });
    setEditError(null);
  }, [licenseKey]);

  const removeImage = useCallback((idx: number) => {
    setImages((prev) => {
      const next = [...prev];
      const removed = next.splice(idx, 1)[0];
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
  }, []);

  const clearImages = useCallback(() => {
    setImages((cur) => {
      cur.forEach((i) => URL.revokeObjectURL(i.preview));
      return [];
    });
  }, []);

  const acceptFiles = useCallback(
    (files: File[]) => {
      const remaining = SUPPORT_MAX_IMAGES - images.length;
      if (remaining <= 0) return;
      const accepted: PendingImage[] = [];
      for (const f of files.slice(0, remaining)) {
        if (!f.type.startsWith("image/")) continue;
        if (f.size > 5 * 1024 * 1024) continue;
        accepted.push({ file: f, preview: URL.createObjectURL(f) });
      }
      if (accepted.length > 0) {
        setImages((prev) => [...prev, ...accepted]);
      }
    },
    [images.length]
  );

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    acceptFiles(files);
  };

  const onPaste = (e: ReactClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pictureFiles: File[] = [];
    for (const it of Array.from(items)) {
      if (it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) pictureFiles.push(f);
      }
    }
    if (pictureFiles.length > 0) {
      e.preventDefault();
      acceptFiles(pictureFiles);
    }
  };

  /* ── Send handler ── */
  const send = useCallback(async () => {
    if (sending) return;

    // Edit mode
    if (editTarget) {
      const trimmed = text.trim();
      if (!trimmed || trimmed === editTarget.content) {
        onCancelEdit();
        setText("");
        return;
      }
      setSending(true);
      const res = await onSubmitEdit(editTarget.id, trimmed);
      setSending(false);
      if (res.ok) {
        setText("");
        setEditError(null);
        onCancelEdit();
        sounds.send();
      } else {
        if (res.code === "EDIT_WINDOW_EXPIRED") {
          setEditError(t("support.edit_window_expired"));
        } else {
          setEditError(res.error ?? "Error");
        }
      }
      return;
    }

    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;

    setSending(true);
    sounds.send();
    const reply = replyTo
      ? {
          id: replyTo.id,
          name: replyTo.senderName,
          content: replyTo.content || "",
        }
      : null;

    try {
      if (images.length > 0) {
        // Upload all images, then dispatch one send per image. Caption goes on first.
        const uploaded: { url: string; caption: string }[] = [];
        for (let i = 0; i < images.length; i++) {
          const url = await uploadToCloudinary(images[i].file);
          if (url) {
            uploaded.push({ url, caption: i === 0 ? trimmed : "" });
          }
        }
        for (let i = 0; i < uploaded.length; i++) {
          await onSendImage(
            uploaded[i].url,
            uploaded[i].caption,
            i === 0 && reply ? { replyTo: reply } : undefined
          );
        }
      } else {
        await onSendText(trimmed, reply ? { replyTo: reply } : undefined);
      }
      setText("");
      clearImages();
      onCancelReply();
    } finally {
      setSending(false);
    }
  }, [
    sending,
    editTarget,
    text,
    images,
    replyTo,
    onSubmitEdit,
    onCancelEdit,
    onSendText,
    onSendImage,
    onCancelReply,
    clearImages,
    t,
  ]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    } else if (e.key === "Escape") {
      if (editTarget) {
        onCancelEdit();
        setText("");
      } else if (replyTo) {
        onCancelReply();
      }
    } else {
      // Notify typing on real keystrokes (not modifiers)
      if (!editTarget && (e.key.length === 1 || e.key === "Backspace")) {
        onTyping();
      }
    }
  };

  /* ── Voice gesture handlers ── */
  const onMicDown = useCallback(
    async (e: React.PointerEvent) => {
      if (editTarget) return;
      e.preventDefault();
      cancelledRef.current = false;
      recPointerRef.current = { x: e.clientX, y: e.clientY };
      setRecState("recording");
      await recorder.startRecording();
    },
    [editTarget, recorder]
  );

  const onMicMove = useCallback((e: React.PointerEvent) => {
    if (!recPointerRef.current || recState !== "recording") return;
    const dx = e.clientX - recPointerRef.current.x;
    const dy = e.clientY - recPointerRef.current.y;
    if (dy < -80) {
      // Lock mode
      setRecState("locked");
    } else if (dx < -80) {
      // Cancel
      cancelledRef.current = true;
      recorder.stopRecording();
      setRecState("idle");
    }
  }, [recState, recorder]);

  const onMicUp = useCallback(async () => {
    if (recState === "locked") return; // Only stop via lock-mode controls
    if (recState !== "recording") return;
    if (cancelledRef.current) {
      cancelledRef.current = false;
      recPointerRef.current = null;
      recorder.discardRecording();
      setRecState("idle");
      return;
    }
    recorder.stopRecording();
    // We'll wait for audioBlob to populate via useEffect below
  }, [recState, recorder]);

  const onMicCancel = useCallback(() => {
    if (recState === "idle") return;
    cancelledRef.current = true;
    recorder.stopRecording();
    recorder.discardRecording();
    setRecState("idle");
    recPointerRef.current = null;
  }, [recorder, recState]);

  const onLockedSend = useCallback(() => {
    if (recState !== "locked") return;
    recorder.stopRecording();
  }, [recState, recorder]);

  // When recorder finalizes blob → upload + dispatch
  useEffect(() => {
    if (!recorder.audioBlob || cancelledRef.current) return;
    let mounted = true;
    (async () => {
      const file = new File([recorder.audioBlob!], `voice-${Date.now()}.webm`, {
        type: recorder.audioBlob!.type || "audio/webm",
      });
      const url = await uploadToCloudinary(file, "video");
      if (!mounted) return;
      if (url) {
        const reply = replyTo
          ? {
              id: replyTo.id,
              name: replyTo.senderName,
              content: replyTo.content || "",
            }
          : null;
        await onSendAudio(url, reply ? { replyTo: reply } : undefined);
        sounds.send();
        onCancelReply();
      }
      recorder.discardRecording();
      setRecState("idle");
      recPointerRef.current = null;
    })();
    return () => {
      mounted = false;
    };
  }, [recorder, recorder.audioBlob, replyTo, onSendAudio, onCancelReply]);

  /* ── Drag-drop ── */
  const onDropFiles = useCallback(
    (files: File[]) => {
      acceptFiles(files);
    },
    [acceptFiles]
  );

  const showRecordingOverlay = recState === "recording" || recState === "locked";

  // Format recorder duration
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const sendDisabled = useMemo(() => {
    if (sending) return true;
    if (editTarget) {
      const trimmed = text.trim();
      return !trimmed || trimmed === editTarget.content;
    }
    return text.trim().length === 0 && images.length === 0;
  }, [sending, editTarget, text, images.length]);

  /* ── Suppress drag overlay when recording ── */
  const dragDisabled = showRecordingOverlay || disabled;

  return (
    <div
      className="border-t border-border bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      onDragOver={(e: ReactDragEvent) => e.preventDefault()}
    >
      {/* Drag-drop overlay (positioned by container) */}
      <SupportDragDropOverlay
        containerRef={dropContainerRef}
        onFiles={onDropFiles}
        disabled={dragDisabled}
      />

      {/* Edit indicator */}
      {editTarget && (
        <div className="mb-2 flex items-center gap-2 rounded-md border-l-2 border-amber-500 bg-amber-500/10 px-2 py-1.5 text-xs">
          <span className="text-amber-700 dark:text-amber-400">{t("support.edit")}:</span>
          <span className="flex-1 truncate text-muted-foreground">
            {editTarget.content || "(media)"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => {
              onCancelEdit();
              setText("");
              setEditError(null);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {editError && (
        <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] text-destructive">
          {editError}
        </div>
      )}

      {/* Reply preview */}
      {replyTo && !editTarget && (
        <div className="mb-2 flex items-center gap-2 rounded-md border-l-2 border-primary bg-muted/40 px-2 py-1.5 text-xs">
          <span className="text-muted-foreground">
            {t("support.reply_to").replace("{name}", replyTo.senderName)}:
          </span>
          <span className="flex-1 truncate text-foreground">
            {replyTo.content || t("support.image_label")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onCancelReply}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {images.map((img, i) => (
            <div key={img.preview} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.preview}
                alt=""
                className="h-16 w-16 rounded-md object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground"
                aria-label="Remove"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          {images.length < SUPPORT_MAX_IMAGES && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Recording overlay */}
      <AnimatePresence>
        {showRecordingOverlay && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="mb-2 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2"
          >
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-destructive" />
            <span className="font-mono text-xs text-destructive">
              {formatDuration(recorder.duration)}
            </span>
            <span className="flex-1 truncate text-[11px] text-muted-foreground">
              {recState === "locked"
                ? t("support.locked_recording_hint")
                : t("support.send_voice_hint")}
            </span>
            {recState === "locked" ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={onMicCancel}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  className="h-7 w-7"
                  onClick={onLockedSend}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main row */}
      <div className="flex items-end gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={
            disabled || images.length >= SUPPORT_MAX_IMAGES || showRecordingOverlay
          }
          aria-label={t("support.attach_image")}
        >
          <ImagePlus className="h-4 w-4" />
        </Button>

        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={disabled || showRecordingOverlay}
                aria-label="Emoji"
              />
            }
          >
            <Smile className="h-4 w-4" />
          </PopoverTrigger>
          <PopoverContent
            align={isMobile ? "center" : "start"}
            side="top"
            className="w-[300px] p-0"
          >
            <SupportEmojiPicker
              onSelect={(emoji) => {
                setText((cur) => cur + emoji);
                textareaRef.current?.focus();
              }}
            />
          </PopoverContent>
        </Popover>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={t("support.placeholder")}
          maxLength={2000}
          disabled={disabled || showRecordingOverlay}
          className="min-h-[36px] max-h-[120px] flex-1 min-w-0 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />

        {/* Mic / Send: mic when input empty, send otherwise */}
        {!editTarget && text.trim().length === 0 && images.length === 0 ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-primary"
            onPointerDown={onMicDown}
            onPointerMove={onMicMove}
            onPointerUp={onMicUp}
            onPointerCancel={onMicCancel}
            disabled={disabled}
            aria-label={t("support.attach_voice")}
            style={{ touchAction: "none" }}
          >
            <Mic className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={send}
            disabled={sendDisabled}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
