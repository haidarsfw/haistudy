"use client";

import { useState, useRef, useCallback, type ClipboardEvent } from "react";
import { Send, ImagePlus, X, Mic, Loader2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "./voice-recorder";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import type { ChatMessage } from "@/types";
import { sounds } from "@/lib/sounds";
import { ROLE_COLORS, type UserRole } from "@/lib/role-colors";

interface MessageInputProps {
  onSend: (
    content: string,
    replyTo?: { id: string; name: string; content: string } | null
  ) => Promise<void>;
  onSendImage: (file: File, caption?: string, replyTo?: { id: string; name: string; content: string }) => Promise<void>;
  onSendAudio?: (blob: Blob) => Promise<void>;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  disabled?: boolean;
  onlineUserNames?: string[];
  isAdmin?: boolean;
  userRoleMap?: Map<string, UserRole>;
}

export function MessageInput({
  onSend,
  onSendImage,
  onSendAudio,
  replyTo,
  onCancelReply,
  disabled,
  onlineUserNames = [],
  isAdmin = false,
  userRoleMap,
}: MessageInputProps) {
  const { isPreview, guard } = usePreviewGuard();
  const [text, setText] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const removeImageAt = useCallback((index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setPendingImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, [imagePreviews]);

  const clearImages = useCallback(() => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setPendingImages([]);
    setImagePreviews([]);
  }, [imagePreviews]);

  const handleSend = useCallback(async () => {
    if (!guard("preview.chat_blocked")) return;
    if ((!text.trim() && pendingImages.length === 0) || disabled) return;
    try {
      const reply = replyTo
        ? { id: replyTo.id, name: replyTo.authorName, content: replyTo.content }
        : undefined;
      if (pendingImages.length > 0) {
        for (let i = 0; i < pendingImages.length; i++) {
          const caption = i === 0 ? (text.trim() || undefined) : undefined;
          await onSendImage(pendingImages[i], caption, i === 0 ? reply : undefined);
        }
      } else {
        await onSend(text, reply || null);
      }
      setText("");
      clearImages();
      onCancelReply();
      sounds.send();
    } catch {
      // Error handled in hook via toast
    }
  }, [text, pendingImages, disabled, onSend, onSendImage, replyTo, onCancelReply, clearImages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showMentions) {
        // Select first mention
        const filtered = getFilteredUsers();
        if (filtered.length > 0) {
          insertMention(filtered[0]);
        }
        return;
      }
      handleSend();
    }
    if (e.key === "Escape" && showMentions) {
      setShowMentions(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    // Check for @mention trigger
    const cursor = e.target.selectionStart || 0;
    const textBefore = value.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);

    if (atMatch) {
      setMentionFilter(atMatch[1].toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const getFilteredUsers = () => {
    // Only admin can use @all
    const names = isAdmin ? ["all", ...onlineUserNames] : [...onlineUserNames];
    if (!mentionFilter) return names.slice(0, 8);
    return names
      .filter((n) => n.toLowerCase().startsWith(mentionFilter))
      .slice(0, 8);
  };

  const insertMention = (name: string) => {
    const cursor = textareaRef.current?.selectionStart || text.length;
    const textBefore = text.slice(0, cursor);
    const textAfter = text.slice(cursor);
    const atIdx = textBefore.lastIndexOf("@");
    const newText = textBefore.slice(0, atIdx) + `@${name} ` + textAfter;
    setText(newText);
    setShowMentions(false);
    sounds.click();
    textareaRef.current?.focus();
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file && file.size <= 5 * 1024 * 1024) imageFiles.push(file);
      }
    }
    if (imageFiles.length === 0) return;
    e.preventDefault();
    const remaining = 3 - pendingImages.length;
    if (remaining <= 0) return;
    const toAdd = imageFiles.slice(0, remaining);
    setPendingImages(prev => [...prev, ...toAdd]);
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
  }, [pendingImages.length]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const remaining = 3 - pendingImages.length;
    if (remaining <= 0) return;
    const toAdd = files.slice(0, remaining).filter(f => f.size <= 5 * 1024 * 1024);
    if (toAdd.length === 0) return;
    setPendingImages(prev => [...prev, ...toAdd]);
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
  };

  return (
    <div className="border-t border-border bg-background p-3">
      {/* Reply indicator */}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">Membalas</span>
          <span className="font-medium">{replyTo.authorName}</span>
          <span className="flex-1 truncate text-muted-foreground">
            {replyTo.content || "(gambar)"}
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

      {/* Mention autocomplete */}
      {showMentions && (
        <div className="mb-2 rounded-md border border-border bg-popover p-1 shadow-md">
          {getFilteredUsers().map((name) => {
            const role: UserRole = userRoleMap?.get(name.toLowerCase()) || "normal";
            const colorClass = ROLE_COLORS[role].text;
            return (
              <button
                key={name}
                onClick={() => insertMention(name)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className={`font-medium ${colorClass}`}>@{name}</span>
                {name === "all" && (
                  <span className="text-xs text-muted-foreground">
                    (semua orang)
                  </span>
                )}
              </button>
            );
          })}
          {getFilteredUsers().length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Tidak ditemukan
            </p>
          )}
        </div>
      )}

      {/* Voice recorder or text input */}
      <AnimatePresence mode="wait">
        {isVoiceMode ? (
          <VoiceRecorder
            key="voice"
            onSend={async (blob) => {
              if (onSendAudio) await onSendAudio(blob);
              setIsVoiceMode(false);
            }}
            onCancel={() => setIsVoiceMode(false)}
          />
        ) : (
          <div key="text" className="space-y-2">
            {imagePreviews.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative">
                    <img src={preview} alt={`Preview ${i + 1}`} width={80} height={80} loading="lazy" decoding="async" className="h-20 w-20 rounded-lg object-cover" />
                    <button
                      onClick={() => removeImageAt(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {pendingImages.length < 3 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || pendingImages.length >= 3}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-primary"
              onClick={() => setIsVoiceMode(true)}
              disabled={disabled}
            >
              <Mic className="h-4 w-4" />
            </Button>

            <Textarea
              autoFocus
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Ketik pesan... (@mention)"
              className="min-h-[36px] max-h-[120px] resize-none text-sm min-w-0"
              rows={1}
              disabled={disabled}
            />

            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleSend}
              disabled={disabled || (!text.trim() && pendingImages.length === 0)}
            >
              {disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
