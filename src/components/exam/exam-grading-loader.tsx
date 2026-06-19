"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

/**
 * Loading screen displayed while AI grades the exam answers.
 * Shows animated icon and rotating tips.
 */
export function ExamGradingLoader() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
    >
      {/* Animated icon */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5"
      >
        <Sparkles className="h-10 w-10 text-primary" />
      </motion.div>

      <h2 className="mb-2 text-xl font-bold text-foreground">
        {t("exam.grading_title")}
      </h2>
      <p className="mb-8 text-sm text-muted-foreground">
        {t("exam.grading_subtitle")}
      </p>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
