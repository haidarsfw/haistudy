import type { SubjectKilat } from "@/types";
import { bizethicsKilat } from "./bizethics-kilat";

// subjectId -> Belajar Kilat feed for s2-uas-bm. Add an entry per authored subject.
export const kilat: Record<string, SubjectKilat> = {
  bizethics: bizethicsKilat,
};
