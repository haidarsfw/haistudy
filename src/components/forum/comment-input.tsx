"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { sounds } from "@/lib/sounds";

interface CommentInputProps {
  placeholder?: string;
  onSubmit: (content: string, imageUrl?: string) => Promise<void>;
  autoFocus?: boolean;
}

export function CommentInput({
  placeholder = "Tulis komentar...",
  onSubmit,
  autoFocus = false,
}: CommentInputProps) {
  const { guard } = usePreviewGuard();
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!guard("preview.forum_blocked")) return;
    if ((!content.trim() && !imageFile) || isSending) return;
    setError(null);
    setIsSending(true);

    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        setIsUploading(true);
        const url = await uploadToCloudinary(imageFile);
        setIsUploading(false);
        if (url) imageUrl = url;
      }
      await onSubmit(content.trim(), imageUrl);
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      sounds.send();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) {
      setError("Hanya file gambar yang diizinkan");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Handle image paste
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          setError("Ukuran gambar maksimal 5MB");
          return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setError(null);
        return;
      }
    }

    // Handle rich text paste — preserve line breaks from HTML
    const html = e.clipboardData.getData("text/html");
    if (html) {
      e.preventDefault();
      const doc = new DOMParser().parseFromString(html, "text/html");
      doc.querySelectorAll("br, p, div, h1, h2, h3, h4, h5, h6, li, tr, blockquote").forEach((el) => {
        el.insertAdjacentText("beforebegin", "\n");
      });
      const text = (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
      const ta = e.target as HTMLTextAreaElement;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = content.slice(0, start);
      const after = content.slice(end);
      setContent(before + text + after);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {imagePreview && (
        <div className="relative inline-block">
          <Image
            src={imagePreview}
            alt="Preview"
            width={160}
            height={100}
            className="h-20 w-auto rounded-lg object-cover"
            unoptimized
          />
          <button
            onClick={removeImage}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
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
          onChange={handleImageSelect}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={2}
          className="min-h-[60px] resize-none text-sm min-w-0"
          disabled={isSending}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={(!content.trim() && !imageFile) || isSending || isUploading}
          className="shrink-0 self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
