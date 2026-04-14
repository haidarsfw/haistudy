"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ImagePlus, Link2, X, Loader2, Paperclip, Youtube, FileText, Presentation, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { detectMediaType } from "@/lib/media-utils";
import { sounds } from "@/lib/sounds";
import type { Attachment, AttachmentType } from "@/types";

const MAX_ATTACHMENTS = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/** A pending attachment: either an image file to upload or a URL */
interface PendingAttachment {
  id: string;
  type: "image-file" | "url";
  file?: File;
  preview?: string; // blob URL for image preview
  url?: string;
  attachmentType: AttachmentType;
  label?: string;
}

function getAttachmentIcon(type: AttachmentType) {
  switch (type) {
    case "image": return <ImagePlus className="h-3.5 w-3.5" />;
    case "youtube": return <Youtube className="h-3.5 w-3.5" />;
    case "google-slides": return <Presentation className="h-3.5 w-3.5" />;
    case "google-pdf": return <FileText className="h-3.5 w-3.5" />;
    case "link": return <Globe className="h-3.5 w-3.5" />;
  }
}

function getAttachmentLabel(type: AttachmentType) {
  switch (type) {
    case "image": return "Gambar";
    case "youtube": return "YouTube";
    case "google-slides": return "Google Slides";
    case "google-pdf": return "Google Drive";
    case "link": return "Link";
  }
}

interface ThreadFormProps {
  onSubmit: (data: {
    title: string;
    content: string;
    imageUrl?: string;
    mediaUrl?: string;
    attachments?: Attachment[];
  }) => Promise<void>;
  onCancel: () => void;
}

export function ThreadForm({ onSubmit, onCancel }: ThreadFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_ATTACHMENTS - pending.length;

  // ─── Image selection (supports multiple) ───
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const toAdd: PendingAttachment[] = [];
    for (const file of files) {
      if (pending.length + toAdd.length >= MAX_ATTACHMENTS) {
        setError(`Maksimal ${MAX_ATTACHMENTS} attachment`);
        break;
      }
      if (!file.type.startsWith("image/")) {
        setError("Hanya file gambar yang diizinkan");
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError("Ukuran gambar maksimal 5MB");
        continue;
      }
      toAdd.push({
        id: crypto.randomUUID(),
        type: "image-file",
        file,
        preview: URL.createObjectURL(file),
        attachmentType: "image",
      });
    }

    if (toAdd.length > 0) {
      setPending((prev) => [...prev, ...toAdd]);
      if (toAdd.length === files.length) setError(null);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Link addition ───
  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    if (pending.length >= MAX_ATTACHMENTS) {
      setError(`Maksimal ${MAX_ATTACHMENTS} attachment`);
      return;
    }

    const url = linkInput.trim();
    const mediaType = detectMediaType(url);
    let attachmentType: AttachmentType;

    if (mediaType === "youtube") attachmentType = "youtube";
    else if (mediaType === "google-slides") attachmentType = "google-slides";
    else if (mediaType === "google-pdf") attachmentType = "google-pdf";
    else attachmentType = "link";

    setPending((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "url",
        url,
        attachmentType,
        label: url.length > 50 ? url.slice(0, 47) + "..." : url,
      },
    ]);
    setLinkInput("");
    setError(null);
  };

  // ─── Remove attachment ───
  const removeAttachment = (id: string) => {
    setPending((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  // ─── Paste handler ───
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Handle image paste
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        if (pending.length >= MAX_ATTACHMENTS) {
          setError(`Maksimal ${MAX_ATTACHMENTS} attachment`);
          return;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          setError("Ukuran gambar maksimal 5MB");
          return;
        }
        setPending((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: "image-file",
            file,
            preview: URL.createObjectURL(file),
            attachmentType: "image",
          },
        ]);
        setError(null);
        return;
      }
    }

    // Handle rich text paste — extract text with preserved line breaks
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

  // ─── Submit ───
  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Judul tidak boleh kosong");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload all image files and build final attachments
      const attachments: Attachment[] = [];

      for (const item of pending) {
        if (item.type === "image-file" && item.file) {
          const uploadedUrl = await uploadToCloudinary(item.file);
          if (uploadedUrl) {
            attachments.push({ type: "image", url: uploadedUrl });
          }
        } else if (item.type === "url" && item.url) {
          attachments.push({
            type: item.attachmentType,
            url: item.url,
            label: item.label,
          });
        }
      }

      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      sounds.send();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat thread");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <Input
        placeholder="Judul thread..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        disabled={isSubmitting}
      />

      <Textarea
        placeholder="Tulis isi thread... (opsional)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handlePaste}
        rows={4}
        className="resize-none"
        disabled={isSubmitting}
      />

      {/* Attachments preview */}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pending.map((item) => (
            <div
              key={item.id}
              className="relative flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs"
            >
              {item.type === "image-file" && item.preview ? (
                <Image
                  src={item.preview}
                  alt="Preview"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded object-cover"
                  unoptimized
                />
              ) : (
                getAttachmentIcon(item.attachmentType)
              )}
              <span className="max-w-[120px] truncate text-muted-foreground">
                {item.type === "image-file"
                  ? item.file?.name || "Gambar"
                  : getAttachmentLabel(item.attachmentType)}
              </span>
              <button
                onClick={() => removeAttachment(item.id)}
                className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link URL input */}
      {showLinkInput && (
        <div className="flex gap-2">
          <Input
            placeholder="URL YouTube, Google Slides, Google Drive, atau link lain..."
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddLink();
              }
            }}
            disabled={isSubmitting}
            className="flex-1"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddLink}
            disabled={!linkInput.trim() || isSubmitting}
          >
            Tambah
          </Button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
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
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting || remaining <= 0}
        >
          <ImagePlus className="h-4 w-4" />
          Gambar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => { sounds.toggle(); setShowLinkInput(!showLinkInput); }}
          disabled={isSubmitting || remaining <= 0}
        >
          <Link2 className="h-4 w-4" />
          Link
        </Button>

        {/* Attachment counter */}
        {pending.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            {pending.length}/{MAX_ATTACHMENTS}
          </span>
        )}

        <div className="flex-1" />

        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : null}
          Posting
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </motion.div>
  );
}
