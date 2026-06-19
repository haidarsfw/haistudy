import type { ExamData } from "@/types/exam";
import { bizethicsExam } from "./bizethics-exam";

/**
 * Exam data registry for S2 UAS BM.
 * Add new subjects by importing their exam file and registering here.
 */
export const examData: Record<string, ExamData> = {
  bizethics: bizethicsExam,
  // Future: opsmgmt, akuntansi, foundai
};
