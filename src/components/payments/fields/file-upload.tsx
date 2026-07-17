"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud, Loader2, X, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { compressImageToBudget } from "@/lib/image";
import { useTranslation } from "@/components/providers/language-provider";
import { PROOF_ACCEPT, PROOF_MAX_BYTES, PROOF_TARGET_BYTES } from "@/lib/payments";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value: File | null;
  onChange: (f: File | null) => void;
  invalid?: boolean;
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return Math.max(1, Math.round(bytes / 1024)) + " KB";
}

const ACCEPT_RE = /^image\/(jpe?g|png|webp|hei[cf])$/i;

export function FileUpload({ value, onChange, invalid }: FileUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origSize, setOrigSize] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      const isImage = ACCEPT_RE.test(file.type) || /\.(jpe?g|png|webp|hei[cf])$/i.test(file.name);
      if (!isImage) {
        setError(t("payments.file_type_error"));
        return;
      }
      if (file.size > PROOF_MAX_BYTES) {
        setError(t("payments.file_too_large"));
        return;
      }
      setBusy(true);
      setOrigSize(file.size);
      try {
        const compressed = await compressImageToBudget(file, {
          maxBytes: PROOF_TARGET_BYTES,
        });
        onChange(compressed);
      } catch {
        setError(t("payments.file_compress_error"));
      } finally {
        setBusy(false);
      }
    },
    [onChange, t]
  );

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const [dragOver, setDragOver] = useState(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const clear = () => {
    onChange(null);
    setOrigSize(null);
    setError(null);
  };

  if (value && previewUrl) {
    return (
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Pratinjau bukti pembayaran" className="max-h-56 w-full object-contain" />
          <button
            type="button"
            onClick={clear}
            aria-label={t("payments.file_remove")}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur transition-colors hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
          {origSize && origSize !== value.size ? (
            <span>
              {fmtSize(origSize)} → <span className="font-medium text-foreground">{fmtSize(value.size)}</span>{" "}
              {t("payments.file_compressed")}
            </span>
          ) : (
            <span>{fmtSize(value.size)}</span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        disabled={busy}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : invalid
              ? "border-destructive/50 hover:bg-muted/40"
              : "border-border hover:border-primary/40 hover:bg-muted/40"
        )}
      >
        {busy ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{t("payments.file_processing")}</span>
          </>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium text-foreground">{t("payments.file_cta")}</span>
            <span className="text-xs text-muted-foreground">{t("payments.file_hint")}</span>
          </>
        )}
      </motion.button>
      <input
        ref={inputRef}
        type="file"
        accept={PROOF_ACCEPT}
        onChange={onInput}
        className="hidden"
      />
      {/* Matches the validation errors in FieldShell — one size for every error. */}
      {error && <p className="text-[11px] font-medium text-destructive">{error}</p>}
    </div>
  );
}
