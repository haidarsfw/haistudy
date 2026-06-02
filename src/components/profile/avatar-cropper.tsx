"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { motion } from "framer-motion";
import { Loader2, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/components/providers/language-provider";
import { getCroppedBlob } from "@/lib/image";
import { sounds } from "@/lib/sounds";

interface AvatarCropperProps {
  /** Object URL of the (already HEIC-converted) source image. Parent owns it. */
  src: string;
  onCancel: () => void;
  onApply: (blob: Blob) => void;
}

/**
 * Self-contained circular avatar cropper. Rendered as a fixed inset-0 overlay
 * at z-[130] so it sits above the settings modal (z-101) and any popover. NOT a
 * nested base-ui Dialog - that would stack focus-traps. Pointer events on the
 * root are stopped so a backdrop click never reaches the underlying modal's
 * outside-press handler. Lazy-loaded by ProfileEditor via next/dynamic, which
 * keeps react-easy-crop out of the initial bundle.
 */
export default function AvatarCropper({ src, onCancel, onApply }: AvatarCropperProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setArea(pixels);
  }, []);

  const handleApply = async () => {
    if (!area) return;
    setApplying(true);
    try {
      const blob = await getCroppedBlob(src, area);
      sounds.click();
      onApply(blob);
    } catch {
      toast.error(t("profile.upload_error"));
      setApplying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      {/* Backdrop click = cancel */}
      <button
        type="button"
        aria-label={t("common.cancel")}
        onClick={onCancel}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">{t("profile.crop_title")}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t("common.cancel")}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Crop surface */}
        <div className="relative h-72 w-full bg-black sm:h-80">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid
            minZoom={1}
            maxZoom={3}
            zoomSpeed={0.2}
            restrictPosition
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom + actions */}
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              aria-label={t("profile.crop_zoom")}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={applying}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={handleApply}
              disabled={applying || !area}
            >
              {applying ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              {t("profile.crop_apply")}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
