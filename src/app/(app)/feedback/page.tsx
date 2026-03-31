"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { MessageSquarePlus, Send, CheckCircle2, ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { sounds } from "@/lib/sounds";

const CATEGORIES = [
  { value: "bug", labelKey: "feedback.cat_bug" },
  { value: "feature", labelKey: "feedback.cat_feature" },
  { value: "other", labelKey: "feedback.cat_other" },
] as const;

export default function FeedbackPage() {
  const { session } = useSession();
  const { t } = useTranslation();
  const { guard } = usePreviewGuard();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const [category, setCategory] = useState<string>(
    CATEGORIES.some((c) => c.value === initialCategory) ? initialCategory! : "feature"
  );
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - images.length;
    const toAdd = files.slice(0, remaining);
    const newImages = toAdd
      .filter((f) => f.size <= 5 * 1024 * 1024)
      .map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setImages((prev) => [...prev, ...newImages]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (images.length >= 3) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file || file.size > 5 * 1024 * 1024) return;
        setImages((prev) => [...prev, { file, preview: URL.createObjectURL(file) }]);
        return;
      }
    }
  };

  const handleSubmit = async () => {
    if (!guard("preview.feedback_blocked")) return;
    if (!message.trim() || !session) return;
    setSending(true);
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        setUploading(true);
        const results = await Promise.all(
          images.map((img) => uploadToCloudinary(img.file))
        );
        imageUrls = results.filter((url): url is string => url !== null);
        setUploading(false);
      }
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseKey: session.licenseKey,
          name: session.name,
          category,
          message: message.trim(),
          imageUrls,
        }),
      });
      setSent(true);
      sounds.send();
      setMessage("");
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
    } catch {
      // silent
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  if (!session) return null;

  return (
    <motion.div
      className="mx-auto max-w-3xl px-4 py-6 space-y-6"
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={staggerItem}>
        <h1 className="font-heading text-xl font-bold flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5 text-primary" />
          {t("feedback.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("feedback.subtitle")}
        </p>
      </motion.div>

      {sent ? (
        <motion.div
          variants={staggerItem}
          className="rounded-2xl border border-border bg-card p-8 text-center space-y-3"
        >
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="font-heading text-lg font-semibold">{t("feedback.thanks")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("feedback.thanks_desc")}
          </p>
          <Button
            variant="outline"
            onClick={() => setSent(false)}
            className="mt-2"
          >
            {t("feedback.send_again")}
          </Button>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerItem}
          className="rounded-2xl border border-border bg-card p-6 space-y-5"
        >
          {/* Category selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("feedback.category")}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                    category === cat.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                  }`}
                >
                  {t(cat.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("feedback.message")}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onPaste={handlePaste}
              placeholder={t("feedback.placeholder")}
              rows={5}
              maxLength={1000}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/1000
            </p>
          </div>

          {/* Image attachments */}
          <div className="space-y-2">
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <Image
                      src={img.preview}
                      alt={`Preview ${i + 1}`}
                      width={100}
                      height={75}
                      className="rounded-lg border border-border object-cover h-[75px] w-[100px]"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-md hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length < 3 && (
              <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors cursor-pointer">
                <ImagePlus className="h-4 w-4" />
                {t("feedback.attach_image")} ({images.length}/3)
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  multiple
                />
              </label>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || sending}
            className="w-full gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {uploading ? t("feedback.uploading") : sending ? t("feedback.sending") : t("feedback.submit")}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
