"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ImagePlus, Link2, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { detectMediaType } from "@/lib/media-utils";
import { sounds } from "@/lib/sounds";

interface ThreadFormProps {
  onSubmit: (data: {
    title: string;
    content: string;
    imageUrl?: string;
    mediaUrl?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function ThreadForm({ onSubmit, onCancel }: ThreadFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
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
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Judul tidak boleh kosong");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let imageUrl: string | undefined;

      // Upload image if selected
      if (imageFile) {
        const url = await uploadToCloudinary(imageFile);
        if (url) {
          imageUrl = url;
        }
      }

      // Validate media URL if provided
      let validMediaUrl: string | undefined;
      if (mediaUrl.trim()) {
        const type = detectMediaType(mediaUrl.trim());
        if (!type) {
          setError("URL media harus YouTube atau Google Slides");
          setIsSubmitting(false);
          return;
        }
        validMediaUrl = mediaUrl.trim();
      }

      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        imageUrl,
        mediaUrl: validMediaUrl,
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
        maxLength={2000}
        rows={4}
        className="resize-none"
        disabled={isSubmitting}
      />

      {/* Image preview */}
      {imagePreview && (
        <div className="relative inline-block">
          <Image
            src={imagePreview}
            alt="Preview"
            width={200}
            height={128}
            className="h-32 w-auto rounded-lg object-cover"
            unoptimized
          />
          <button
            onClick={removeImage}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Media URL input */}
      {showMediaInput && (
        <Input
          placeholder="URL YouTube atau Google Slides..."
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          disabled={isSubmitting}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting}
        >
          <ImagePlus className="h-4 w-4" />
          Gambar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => { sounds.toggle(); setShowMediaInput(!showMediaInput); }}
          disabled={isSubmitting}
        >
          <Link2 className="h-4 w-4" />
          Media
        </Button>

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
