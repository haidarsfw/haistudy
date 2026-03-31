"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/providers/language-provider";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import { sounds } from "@/lib/sounds";

interface AiInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  aiModel?: "fast" | "reasoning";
  onModelChange?: (model: "fast" | "reasoning") => void;
  showModelToggle?: boolean;
}

export function AiInput({ onSend, disabled, aiModel, onModelChange, showModelToggle }: AiInputProps) {
  const [value, setValue] = useState("");
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();
  const { isPreview, guard } = usePreviewGuard();

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const handleSubmit = useCallback(() => {
    if (!guard("preview.ai_blocked")) return;
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setPromptHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    onSend(trimmed);
    setValue("");
    sounds.send();
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

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
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isPreview ? t("preview.ai_blocked") : "Tanya tentang materi kuliah..."}
          disabled={disabled || isPreview}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
          maxLength={2000}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
