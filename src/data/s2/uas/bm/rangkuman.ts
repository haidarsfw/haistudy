import { akuntansiModule1 } from "./akuntansi-m1";
import { akuntansiModule2 } from "./akuntansi-m2";
import { akuntansiModule3 } from "./akuntansi-m3";
import { akuntansiModule4 } from "./akuntansi-m4";
import { akuntansiModule5 } from "./akuntansi-m5";
import { opsmgmtModule1 } from "./opsmgmt-m1";
import { opsmgmtModule2 } from "./opsmgmt-m2";
import { opsmgmtModule3 } from "./opsmgmt-m3";
import { opsmgmtModule4 } from "./opsmgmt-m4";
import { opsmgmtModule5 } from "./opsmgmt-m5";
import { opsmgmtModule6 } from "./opsmgmt-m6";
import { bizethicsModule1 } from "./bizethics-m1";
import { bizethicsModule2 } from "./bizethics-m2";
import { bizethicsModule3 } from "./bizethics-m3";
import { foundaiModule1 } from "./foundai-m1";
import { foundaiModule2 } from "./foundai-m2";
import { foundaiModule3 } from "./foundai-m3";

/**
 * UAS S2 BM rangkuman (summary) content per subject. Uses custom HTML-like tags
 * parsed by src/lib/content-parser.tsx: <h1>, <h2>, <h3>, <bullet>, <subtitle>,
 * <slide>, <b>, <i>, and inline $...$ KaTeX. Slide images resolve from the
 * Supabase `slides` bucket under s2-uas-bm/{subject}/{name}.png.
 * Shape mirrors UTS: { [subjectId]: { [moduleKey]: htmlString } }.
 */
export const rangkumanContent: Record<string, Record<string, string>> = {
  akuntansi: {
    "Modul 1: Managerial Accounting": akuntansiModule1,
    "Modul 2: Cost-Volume-Profit": akuntansiModule2,
    "Modul 3: Incremental Analysis": akuntansiModule3,
    "Modul 4: Budgetary Planning": akuntansiModule4,
    "Modul 5: Budgetary Control and Responsibility Accounting": akuntansiModule5,
  },

  opsmgmt: {
    "Modul 1: Location Strategies": opsmgmtModule1,
    "Modul 2: Inventory Management": opsmgmtModule2,
    "Modul 3: Aggregate Planning and S&OP": opsmgmtModule3,
    "Modul 4: Material Requirements Planning (MRP) and ERP": opsmgmtModule4,
    "Modul 5: Short-Term Scheduling": opsmgmtModule5,
    "Modul 6: Maintenance, Reliability and Lean Operations": opsmgmtModule6,
  },

  bizethics: {
    "Modul 1: Technology and Privacy in the Workplace & Case Study Discussion": bizethicsModule1,
    "Modul 2: Ethics and Marketing & Business and Environmental Sustainability": bizethicsModule2,
    "Modul 3: Corporate Governance, Accounting, and Finance": bizethicsModule3,
  },

  foundai: {
    "Modul 1: AI with IoT & AI and Robots in Our Lives": foundaiModule1,
    "Modul 2: AI in Entertainment and Gaming & AI and Society": foundaiModule2,
    "Modul 3: Ethics of AI": foundaiModule3,
  },
};

export function getRangkumanBySubjectId(
  subjectId: string
): Record<string, string> | undefined {
  return rangkumanContent[subjectId];
}
