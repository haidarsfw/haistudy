"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Timer, Shuffle, Monitor, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuizQuestion } from "@/types";
import {
  scaleIn,
  staggerContainer,
  staggerItem,
  tapScale,
  hoverLift,
  springSmooth,
} from "@/lib/motion";
import { sounds } from "@/lib/sounds";
import { QUIZ_TIMER_SECONDS } from "@/lib/constants";
import {
  DEFAULT_QUIZ_SETTINGS,
  extractModule,
  getModulesFromQuestions,
  type QuizSettings,
} from "@/hooks/use-quiz";

interface QuizSettingsScreenProps {
  questions: QuizQuestion[];
  subjectId?: string;
  onStart: (settings: QuizSettings) => void;
}

const QUIZ_PREFS_KEY = "hs-quiz-prefs";

interface StoredPrefs {
  lastModuleFilter?: Record<string, string | null>;
  defaultShuffled?: boolean;
  defaultTimerEnabled?: boolean;
}

function readStoredPrefs(): StoredPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(QUIZ_PREFS_KEY);
    return raw ? (JSON.parse(raw) as StoredPrefs) : {};
  } catch {
    return {};
  }
}

export function QuizSettingsScreen({
  questions,
  subjectId,
  onStart,
}: QuizSettingsScreenProps) {
  const modules = useMemo(() => getModulesFromQuestions(questions), [questions]);
  const hasModules = modules.length > 0;

  const [moduleFilter, setModuleFilter] = useState<string | null>(() => {
    if (!subjectId) return null;
    const saved = readStoredPrefs().lastModuleFilter?.[subjectId] ?? null;
    if (!saved) return null;
    return modules.some((m) => m.id === saved) ? saved : null;
  });
  const [shuffled, setShuffled] = useState<boolean>(
    () => readStoredPrefs().defaultShuffled ?? DEFAULT_QUIZ_SETTINGS.shuffled
  );
  const [timerEnabled, setTimerEnabled] = useState<boolean>(
    () =>
      readStoredPrefs().defaultTimerEnabled ?? DEFAULT_QUIZ_SETTINGS.timerEnabled
  );

  const filteredCount = useMemo(() => {
    if (!moduleFilter) return questions.length;
    return questions.filter(
      (q) => extractModule(q.category) === moduleFilter
    ).length;
  }, [questions, moduleFilter]);

  const canShuffle = filteredCount > 1;
  // Derived: if shuffle can't apply, treat as off without resetting state
  const effectiveShuffled = shuffled && canShuffle;

  const handleStart = () => {
    sounds.toggle();
    onStart({ moduleFilter, shuffled: effectiveShuffled, timerEnabled });
  };

  return (
    <motion.div
      className="flex flex-col gap-5 py-6"
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
    >
      {subjectId === "cbkwn" && (
        <motion.div
          className="flex items-start gap-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2.5"
          variants={staggerItem}
        >
          <Monitor className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Ujian mata kuliah ini dilaksanakan secara{" "}
            <span className="font-semibold">online</span>. Silakan kunjungi{" "}
            <a
              href="https://exam.apps.binus.ac.id"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              exam.apps.binus.ac.id
            </a>{" "}
            untuk informasi lebih lanjut.
          </p>
        </motion.div>
      )}

      <motion.section
        className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center"
        variants={staggerItem}
      >
        <motion.div
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
          variants={scaleIn}
        >
          <Play className="h-7 w-7 text-primary" />
        </motion.div>
        <div>
          <h3 className="font-heading text-lg font-semibold">Quiz Time!</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Pilih modul, atur preferensi, lalu mulai.
          </p>
        </div>
      </motion.section>

      <motion.section
        className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden"
        variants={staggerItem}
        aria-labelledby={hasModules ? "quiz-module-heading" : undefined}
      >
        {hasModules && (
          <>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <h4 id="quiz-module-heading" className="text-sm font-semibold">
                  Pilih Modul
                </h4>
              </div>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                <ModulePill
                  label="Semua Modul"
                  count={questions.length}
                  active={moduleFilter === null}
                  onClick={() => setModuleFilter(null)}
                />
                {modules.map((m) => (
                  <ModulePill
                    key={m.id}
                    label={m.id}
                    count={m.count}
                    active={moduleFilter === m.id}
                    onClick={() => setModuleFilter(m.id)}
                  />
                ))}
              </div>
            </div>
            <div className="h-px bg-border" />
          </>
        )}

        <div className="flex flex-col p-2">
          <OptionToggle
            icon={<Shuffle className="h-4 w-4" />}
            title="Acak Soal"
            description={
              canShuffle
                ? "Urutan pertanyaan diacak setiap kali mulai"
                : "Butuh minimal 2 soal untuk diacak"
            }
            active={effectiveShuffled}
            disabled={!canShuffle}
            onChange={setShuffled}
          />
          <div className="h-px bg-border mx-3" />
          <OptionToggle
            icon={<Timer className="h-4 w-4" />}
            title="Aktifkan Timer"
            description={
              timerEnabled
                ? `${QUIZ_TIMER_SECONDS} detik per soal - pause otomatis saat menjawab`
                : "Tanpa batas waktu - baca penjelasan sepuasnya"
            }
            active={timerEnabled}
            onChange={setTimerEnabled}
          />
        </div>
      </motion.section>

      <motion.div className="self-center" variants={staggerItem}>
        <motion.div whileHover={hoverLift} whileTap={tapScale}>
          <Button
            onClick={handleStart}
            size="lg"
            className="min-w-[220px]"
            disabled={filteredCount === 0}
          >
            Mulai Quiz ({filteredCount} soal)
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

interface ModulePillProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function ModulePill({ label, count, active, onClick }: ModulePillProps) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      whileTap={tapScale}
      transition={springSmooth}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-muted/40 text-foreground hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      <span>{label}</span>
      <span
        className={`tabular-nums text-[10px] rounded-full px-1.5 py-0.5 ${
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </motion.button>
  );
}

interface OptionToggleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

function OptionToggle({
  icon,
  title,
  description,
  active,
  disabled,
  onChange,
}: OptionToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={() => onChange(!active)}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/40"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      <div
        className={`relative h-5 w-9 rounded-full border transition-colors shrink-0 ${
          active ? "border-primary bg-primary" : "border-border bg-muted"
        }`}
      >
        <motion.span
          className="absolute top-[1px] left-[1px] h-[15px] w-[15px] rounded-full bg-white shadow-sm"
          animate={{ x: active ? 16 : 0 }}
          transition={springSmooth}
        />
      </div>
    </button>
  );
}
