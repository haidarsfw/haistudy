"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

interface Props {
  /** All image URLs in chronological order. */
  images: string[];
  /** Index of currently shown image; null = closed. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

/**
 * Fullscreen image gallery with:
 *  - Pinch / button zoom (1× / 2.5×)
 *  - Swipe left/right between images
 *  - Swipe down to dismiss (mobile)
 *  - Esc + arrow key navigation (desktop)
 */
export function SupportImageLightbox({ images, index, onClose, onIndexChange }: Props) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const open = index !== null && images[index];

  const reset = useCallback(() => {
    setZoom(1);
    animate(x, 0, { duration: 0.15 });
    animate(y, 0, { duration: 0.15 });
  }, [x, y]);

  useEffect(() => {
    reset();
  }, [index, reset]);

  // Keyboard nav
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      if (e.key === "ArrowRight" && index < images.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, onClose, onIndexChange]);

  const goPrev = () => index !== null && index > 0 && onIndexChange(index - 1);
  const goNext = () =>
    index !== null && index < images.length - 1 && onIndexChange(index + 1);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95"
          onClick={(e) => {
            if (zoom === 1 && e.target === e.currentTarget) onClose();
          }}
        >
          {/* Top bar */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-3 sm:p-4">
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
              {t("support.gallery_position")
                .replace("{i}", String((index ?? 0) + 1))
                .replace("{n}", String(images.length))}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom((z) => (z === 1 ? 2.5 : 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60"
                aria-label="Zoom"
              >
                {zoom === 1 ? (
                  <ZoomIn className="h-4 w-4" />
                ) : (
                  <ZoomOut className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60"
                aria-label={t("support.lightbox_close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Side arrows (desktop) */}
          {index! > 0 && (
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm hover:bg-black/60 sm:flex"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {index! < images.length - 1 && (
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm hover:bg-black/60 sm:flex"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Image — drag for swipe (when zoomed=1) or pan (when zoomed>1) */}
          <motion.img
            key={images[index!]}
            src={images[index!]}
            alt=""
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            drag={zoom === 1 ? "x" : true}
            dragElastic={0.25}
            dragConstraints={
              zoom === 1
                ? { left: -200, right: 200 }
                : undefined
            }
            style={{
              x,
              y,
              scale: zoom,
              maxHeight: "100dvh",
              maxWidth: "100vw",
              touchAction: "none",
              cursor: zoom === 1 ? "grab" : "grabbing",
            }}
            onDragEnd={(_, info) => {
              if (zoom !== 1) return;
              if (info.offset.x < -80 && index! < images.length - 1) {
                goNext();
              } else if (info.offset.x > 80 && index! > 0) {
                goPrev();
              } else if (info.offset.y > 100) {
                onClose();
              } else {
                animate(x, 0, { duration: 0.2 });
                animate(y, 0, { duration: 0.2 });
              }
            }}
            className="select-none object-contain"
            draggable={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
