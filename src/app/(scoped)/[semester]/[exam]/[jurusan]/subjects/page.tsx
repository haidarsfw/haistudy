"use client";

import { motion } from "framer-motion";
import { SubjectGrid } from "@/components/dashboard/subject-grid";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function SubjectsPage() {
  const { t } = useTranslation();
  return (
    <motion.div
      className="mx-auto max-w-5xl px-4 py-6"
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={staggerItem}>
        <h1 className="font-heading text-xl font-bold mb-4">{t("subjects.title")}</h1>
      </motion.div>
      <motion.div variants={staggerItem}>
        <SubjectGrid />
      </motion.div>
    </motion.div>
  );
}
