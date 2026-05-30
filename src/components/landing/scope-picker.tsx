"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, GraduationCap, BookOpen, Building2 } from "lucide-react";
import { AVAILABLE_SCOPES } from "@/lib/scope";
import type { ScopeTuple, ExamPeriod } from "@/types/scope";

// Generic "Coming soon" placeholder slots - no specific jurusan names committed.
// Locked-in decision: only `bm` listed; surface 2 abstract placeholders.
const COMING_SOON_SLOTS = 3;

const EXAM_OPTIONS: { value: ExamPeriod; label: string; sub: string }[] = [
  { value: "uts", label: "UTS", sub: "Mid-semester" },
  { value: "uas", label: "UAS", sub: "Final-semester" },
];

export function ScopePicker() {
  const router = useRouter();
  const [semester, setSemester] = useState<number | null>(null);
  const [examPeriod, setExamPeriod] = useState<ExamPeriod | null>(null);
  const [jurusan, setJurusan] = useState<string | null>(null);

  // Distinct semesters available across the manifest.
  const semesters = Array.from(new Set(AVAILABLE_SCOPES.map((s) => s.semester))).sort((a, b) => a - b);

  // Jurusan options available for the picked (semester, exam) combo.
  const activeJurusan = examPeriod && semester
    ? Array.from(
        new Set(
          AVAILABLE_SCOPES
            .filter((s) => s.semester === semester && s.examPeriod === examPeriod)
            .map((s) => s.jurusan)
        )
      )
    : [];

  const submit = (tuple: ScopeTuple) => {
    const sp = `s${tuple.semester}/${tuple.examPeriod}/${tuple.jurusan}`;
    try {
      localStorage.setItem("hs-preferred-scope", sp);
    } catch {
      // noop
    }
    router.push(`/login?scope=${encodeURIComponent(sp)}`);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-6 space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Pilih periode belajarmu
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Setiap periode (UTS / UAS) per semester per jurusan punya materi, kisi-kisi,
          dan komunitas chat-nya sendiri. Pilih dulu, lalu redeem license key.
        </p>
      </div>

      {/* Step 1: Semester */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          1. Semester
        </p>
        <div className="flex flex-wrap gap-2">
          {semesters.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSemester(s);
                setExamPeriod(null);
                setJurusan(null);
              }}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                semester === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              Semester {s}
            </button>
          ))}
          <span className="px-4 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            Semester lain segera hadir
          </span>
        </div>
      </div>

      {/* Step 2: Exam period */}
      {semester !== null && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            2. Ujian
          </p>
          <div className="grid grid-cols-2 gap-3">
            {EXAM_OPTIONS.map((opt) => {
              const available = AVAILABLE_SCOPES.some(
                (s) => s.semester === semester && s.examPeriod === opt.value
              );
              return (
                <button
                  key={opt.value}
                  disabled={!available}
                  onClick={() => {
                    setExamPeriod(opt.value);
                    setJurusan(null);
                  }}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    examPeriod === opt.value
                      ? "border-primary bg-primary/10"
                      : available
                        ? "border-border hover:border-primary/40 cursor-pointer"
                        : "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{opt.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{opt.sub}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Jurusan */}
      {semester !== null && examPeriod && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            3. Jurusan
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeJurusan.map((jur) => (
              <button
                key={jur}
                onClick={() => {
                  setJurusan(jur);
                  submit({ semester, examPeriod, jurusan: jur });
                }}
                className={`group p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  jurusan === jur
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-semibold uppercase">{jur}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {jur === "bm" ? "Business Management" : jur}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}

            {/* Coming-soon placeholder tiles. No specific jurusan names per
                locked-in decision (#7 of the plan). */}
            {Array.from({ length: COMING_SOON_SLOTS }).map((_, i) => (
              <div
                key={`coming-${i}`}
                className="p-4 rounded-xl border border-dashed border-border bg-muted/20"
              >
                <p className="text-xs text-muted-foreground">
                  Jurusan lain segera hadir
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">Coming soon</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
