"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

interface Props {
  /** Container element to attach drop listeners to. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Called when files are dropped. */
  onFiles: (files: File[]) => void;
  /** Whether drag-drop is enabled (e.g. disable when sending). */
  disabled?: boolean;
}

/**
 * Renders a visual overlay over a container while files are being dragged in.
 * Filters non-image / oversized files; passes the rest to onFiles.
 */
export function SupportDragDropOverlay({ containerRef, onFiles, disabled }: Props) {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes("Files")) return;
      dragCounter.current += 1;
      setActive(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) setActive(false);
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setActive(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) onFiles(files);
    };

    el.addEventListener("dragenter", handleDragEnter);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("drop", handleDrop);
    return () => {
      el.removeEventListener("dragenter", handleDragEnter);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("drop", handleDrop);
    };
  }, [containerRef, onFiles, disabled]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-2 text-primary">
            <ImagePlus className="h-8 w-8" />
            <p className="text-sm font-semibold">{t("support.dragdrop_hint")}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
