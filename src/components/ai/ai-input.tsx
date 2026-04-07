"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Send, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/providers/language-provider";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import { sounds } from "@/lib/sounds";

interface AiInputProps {
  onSend: (text: string, image?: string | null) => void;
  disabled?: boolean;
  aiModel?: "fast" | "reasoning";
  onModelChange?: (model: "fast" | "reasoning") => void;
  showModelToggle?: boolean;
}

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB

function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDim = 1024;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = dataUrl;
  });
}

export function AiInput({ onSend, disabled, aiModel, onModelChange, showModelToggle }: AiInputProps) {
  const [value, setValue] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { isPreview, guard } = usePreviewGuard();

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_SIZE * 2) return; // allow larger, we'll compress

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const compressed = await compressImage(dataUrl);
      setImage(compressed);
    };
    reader.readAsDataURL(file);
  }, []);

  // Paste handler for images
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processFile(file);
          return;
        }
      }
    };
    el.addEventListener("paste", handlePaste);
    return () => el.removeEventListener("paste", handlePaste);
  }, [processFile]);

  const handleSubmit = useCallback(() => {
    if (!guard("preview.ai_blocked")) return;
    const trimmed = value.trim();
    if ((!trimmed && !image) || disabled) return;
    if (trimmed) {
      setPromptHistory(prev => [...prev, trimmed]);
    }
    setHistoryIndex(-1);
    onSend(trimmed || "(gambar)", image);
    setValue("");
    setImage(null);
    sounds.send();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, image, disabled, onSend, guard]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "ArrowUp" && !e.shiftKey && !value.trim()) {
        e.preventDefault();
        if (promptHistory.length > 0) {
          const newIdx = historyIndex === -1 ? promptHistory.length - 1 : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIdx);
          setValue(promptHistory[newIdx]);
        }
      } else if (e.key === "ArrowDown" && historyIndex >= 0) {
        e.preventDefault();
        const newIdx = historyIndex + 1;
        if (newIdx >= promptHistory.length) {
          setHistoryIndex(-1);
          setValue("");
        } else {
          setHistoryIndex(newIdx);
          setValue(promptHistory[newIdx]);
        }
      }
    },
    [handleSubmit, value, promptHistory, historyIndex]
  );

  return (
    <div className="border-t border-border p-3">
      {showModelToggle && (
        <div className="flex items-center gap-0.5 rounded-full bg-muted p-0.5 text-[10px] mb-2 w-fit">
          <button
            onClick={() => onModelChange?.("fast")}
            className={`rounded-full px-2.5 py-0.5 transition-colors ${
              aiModel === "fast" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t("ai.mode_fast")}
          </button>
          <button
            onClick={() => onModelChange?.("reasoning")}
            className={`rounded-full px-2.5 py-0.5 transition-colors ${
              aiModel === "reasoning" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t("ai.mode_reasoning")}
          </button>
        </div>
      )}

      {/* Image preview */}
      {image && (
        <div className="relative mb-2 inline-block">
          <img src={image} alt="Preview" className="max-h-24 rounded-lg border border-border" />
          <button
            onClick={() => setImage(null)}
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isPreview}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          title="Upload gambar"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isPreview ? t("preview.ai_blocked") : image ? "Tulis pertanyaan tentang gambar..." : "Tanya tentang materi kuliah..."}
          disabled={disabled || isPreview}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
          maxLength={2000}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={handleSubmit}
          disabled={disabled || (!value.trim() && !image)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
