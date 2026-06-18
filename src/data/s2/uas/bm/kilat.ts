import type { SubjectKilat } from "@/types";
import { bizethicsKilat } from "./bizethics-kilat";
import { opsmgmtKilat } from "./opsmgmt-kilat";
import { akuntansiKilat } from "./akuntansi-kilat";

// subjectId -> Belajar Kilat feed for s2-uas-bm. Add an entry per authored subject.
export const kilat: Record<string, SubjectKilat> = {
  bizethics: bizethicsKilat,
  opsmgmt: opsmgmtKilat,
  akuntansi: akuntansiKilat,
};
