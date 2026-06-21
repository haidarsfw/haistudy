import type { ExamData } from "@/types/exam";
import { bizethicsExam } from "./bizethics-exam";
import { foundaiExam } from "./foundai-exam";
import { akuntansiExam } from "./akuntansi-exam";
import { opsmgmtExam } from "./opsmgmt-exam";

/**
 * Exam data registry for S2 UAS BM.
 * Add new subjects by importing their exam file and registering here.
 */
export const examData: Record<string, ExamData> = {
  bizethics: bizethicsExam,
  foundai: foundaiExam,
  akuntansi: akuntansiExam,
  opsmgmt: opsmgmtExam,
};
