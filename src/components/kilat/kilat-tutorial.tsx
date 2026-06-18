"use client";

import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, Hand } from "lucide-react";

export function KilatTutorial({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-black/80 px-8 text-center backdrop-blur-sm"
    >
      <motion.div
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex flex-col items-center gap-1.5 text-white"
      >
        <ChevronUp className="h-7 w-7" />
        <span className="text-sm font-semibold">Geser ke atas buat lanjut</span>
      </motion.div>

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white">
        <Hand className="h-8 w-8" />
      </div>

      <motion.div
        animate={{ y: [6, -6, 6] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex flex-col items-center gap-1.5 text-white/90"
      >
        <span className="text-sm font-semibold">Geser ke bawah buat mundur</span>
        <ChevronDown className="h-7 w-7" />
      </motion.div>

      <p className="max-w-xs text-[13px] leading-relaxed text-white/70">
        Jawab soalnya dulu baru bisa lanjut. Kalau mau lewatin, pencet/geser dua kali (dihitung 0).
      </p>

      <button
        type="button"
        onClick={onDismiss}
        className="hs-press rounded-full bg-white px-7 py-2.5 text-sm font-bold text-black"
      >
        Oke, mulai
      </button>
    </motion.div>
  );
}
