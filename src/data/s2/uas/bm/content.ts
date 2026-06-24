import type { SubjectContent } from "@/types";
import { akuntansiFlashcards } from "./akuntansi-flashcards";
import { akuntansiQuiz } from "./akuntansi-quiz";
import { opsmgmtFlashcards } from "./opsmgmt-flashcards";
import { opsmgmtQuiz } from "./opsmgmt-quiz";
import { bizethicsFlashcards } from "./bizethics-flashcards";
import { bizethicsQuiz } from "./bizethics-quiz";
import { foundaiFlashcards } from "./foundai-flashcards";
import { foundaiQuiz } from "./foundai-quiz";
import { opsmgmtCheatsheetFull } from "./opsmgmt-cheatsheet-full";

/**
 * UAS S2 BM content. Official lecture slides only (materi[]) — sourced from the
 * cohort Drive. Sessions cover the post-UTS half of the term. Rangkuman,
 * kisi-kisi, flashcards, and quiz are intentionally empty; the subject page
 * auto-hides those tabs when their arrays are empty.
 */
export const content: Record<string, SubjectContent> = {
  bizethics: {
    materi: [
      { id: 1, title: "Ethical Decision Making: Technology & Privacy in the Workplace", driveId: "1MnpjVfLenOxTtd9H0jc_hKkq874-xf57", type: "drive-pptx", session: "8", xp: 10 },
      { id: 2, title: "Ethical Decision Making: Case Study Discussion", driveId: "1avrKOqmkFw4IFrKY-2iQcZEUePbZtdur", type: "drive-pptx", session: "9", xp: 10 },
      { id: 3, title: "Ethics and Marketing", driveId: "1X4ouM4_OPnttvt27VYxWT4wMtJf-JViB", type: "drive-pptx", session: "10", xp: 10 },
      { id: 4, title: "Business and Environmental Sustainability", driveId: "1xL1RqbdKGamZr7wY3rJ9u6EDQxhTbMKn", type: "drive-pptx", session: "11", xp: 10 },
      { id: 5, title: "Ethical Decision Making: Corporate Governance, Accounting & Finance", driveId: "12BVjBX-ipUVmzoMjune65nsDkIhyEj67", type: "drive-pptx", session: "12", xp: 10 },
    ],
    kisiKisi: [],
    kisiKisiInfo: [
      { label: "Format Soal", value: "Essay 40% + Case Study 60%" },
      { label: "Cara Menjawab", value: "Semua soal wajib dijawab dengan teori" },
    ],
    kisiKisiNote: "",
    flashcards: bizethicsFlashcards,
    quiz: bizethicsQuiz,
  },

  opsmgmt: {
    materi: [
      { id: 1, title: "Location Strategies", driveId: "1tLuc-qnxn54M_b6B8AQKw0Y_-NakA8GQ", type: "drive-pptx", session: "15–16", xp: 10 },
      { id: 2, title: "Inventory Management", driveId: "1uTOlOfLyeszsENdx7fDphAFWf0t0rppQ", type: "drive-pptx", session: "17–18", xp: 10 },
      { id: 3, title: "Aggregate Planning and S&OP", driveId: "1i-J9h3rQnPXr4dSK6KYeTcNWA9qzimdB", type: "drive-pptx", session: "19–20", xp: 10 },
      { id: 4, title: "Material Requirements Planning (MRP) and ERP", driveId: "1YOlltg1PKZK8Iwe_HgyLYf_r6-NJDr4E", type: "drive-pptx", session: "21–22", xp: 10 },
      { id: 5, title: "Short-Term Scheduling", driveId: "14-DACfODzWVFHohGEaWC-ohuj0YkYknd", type: "drive-pptx", session: "23–24", xp: 10 },
      { id: 6, title: "Maintenance and Reliability", driveId: "1GaY403UpN2EmLZA9NWWJGPZjVNkVHGxp", type: "drive-pptx", session: "25–26", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Soal Kasus (Case Study)", items: [
        "Location Strategies",
        "Material Requirements Planning (MRP)",
        "Short-Term Scheduling",
      ] },
      { topic: "Soal Essay", items: [
        "Inventory Management",
        "Aggregate Planning",
        "Lean Operation",
        "Maintenance",
        "Reliability",
      ] },
    ],
    kisiKisiNote: "Rangkuman kisi-kisi dan aturan UAS Operations Management.",
    kisiKisiInfo: [
      { label: "Jumlah Soal", value: "5 soal — 3 soal hitungan + 2 soal teori" },
      { label: "Cheating Note", value: "Diperbolehkan, maksimal 5 lembar kertas A4 bolak-balik" },
      { label: "Aturan Penulisan", value: "Wajib ditulis tangan dengan tinta selain warna hitam" },
      { label: "Kalkulator", value: "Diperbolehkan" },
      { label: "Penggaris", value: "Diperbolehkan" },
    ],
    flashcards: opsmgmtFlashcards,
    quiz: opsmgmtQuiz,
    cheatsheetFull: opsmgmtCheatsheetFull,
  },

  akuntansi: {
    materi: [
      { id: 1, title: "Managerial Accounting", driveId: "1I-gihxHJOR0JJpXSvb2XQG9A4WuqcBhW", type: "drive-pptx", session: "15–16", xp: 10 },
      { id: 2, title: "Cost-Volume-Profit Analysis", driveId: "1dGJTx6lqKxZQKGcRJF-9zko53Z4MFNUQ", type: "drive-pptx", session: "17–20", xp: 10 },
      { id: 3, title: "Incremental Analysis", driveId: "17RzRRV4IMpQQpENCwXy7VB61Y0sAm5rT", type: "drive-pptx", session: "21–22", xp: 10 },
      { id: 4, title: "Budgetary Planning", driveId: "1hllAwOrDSk1_At-7gNC7QsqvHWqL6rGd", type: "drive-pptx", session: "23–24", xp: 10 },
      { id: 5, title: "Budgetary Control & Responsibility Accounting", driveId: "13Mi65ojCwJavEeErRJOYFTc-1-XuZ_DP", type: "drive-pptx", session: "25–26", xp: 10 },
    ],
    kisiKisi: [],
    kisiKisiNote: "",
    flashcards: akuntansiFlashcards,
    quiz: akuntansiQuiz,
  },

  foundai: {
    materi: [
      { id: 1, title: "AI with IoT", driveId: "17CFJeSAe9mV25a5cMRrpsxyaIbf6NLwj", type: "drive-pptx", session: "8", xp: 10 },
      { id: 2, title: "AI and Robots in Our Lives", driveId: "1-c8yByRzz86ojo8lTRZvKdNovjOSojq7", type: "drive-pptx", session: "9", xp: 10 },
      { id: 3, title: "AI in Entertainment and Gaming", driveId: "1zJL1oeVELw2QNdEeuCa379v1FwwjG0KJ", type: "drive-pptx", session: "10", xp: 10 },
      { id: 4, title: "AI and Society: Shaping the Future", driveId: "1EZ0K-0ix8avh8JYc4zsZkLJW7JbKwuVl", type: "drive-pptx", session: "11", xp: 10 },
      { id: 5, title: "Ethics of AI", driveId: "1hTtuc_5JWd5hbQ2VVz3iszpDHDEug_mI", type: "drive-pptx", session: "12", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Multiple Choice with Reasoning (Nilai: 25%)", items: [
        "Soal true or false menjadi pilihan ganda, beserta alasannya",
      ] },
      { topic: "Studi Kasus: AI Solution Recommendation (Nilai: 60%)", items: [
        "Mencakup solusi, teknologi yang dipakai, dan manfaatnya",
      ] },
      { topic: "Studi Kasus: Ethical Consideration (Nilai: 15%)", items: [
        "Etika dalam menggunakan AI",
      ] },
    ],
    kisiKisiNote: "Ujian lebih fokus ke studi kasus.",
    flashcards: foundaiFlashcards,
    quiz: foundaiQuiz,
  },
};

export function getContentBySubjectId(id: string): SubjectContent | undefined {
  return content[id];
}
