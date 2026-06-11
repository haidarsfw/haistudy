// Scope s1-uts-bm rangkuman. HTML uses custom tags
// <h1/h2/h3/bullet/subtitle/warning/img/b/i> parsed by src/lib/content-parser.tsx.
// Module key = display title shown in the UI.
import { marketingModule1 } from "./marketing-m1";
import { marketingModule2 } from "./marketing-m2";
import { marketingModule3 } from "./marketing-m3";
import { marketingModule4 } from "./marketing-m4";
import { marketingModule5 } from "./marketing-m5";
import { marketingModule6 } from "./marketing-m6";
import { marketingModule7 } from "./marketing-m7";
import { marketingModule8 } from "./marketing-m8";
import { marketingModule9 } from "./marketing-m9";
import { hrModule1 } from "./hr-m1";
import { hrModule2 } from "./hr-m2";
import { hrModule3 } from "./hr-m3";
import { hrModule4 } from "./hr-m4";
import { hrModule5 } from "./hr-m5";
import { hrModule6 } from "./hr-m6";
import { hrModule7 } from "./hr-m7";
import { hrModule8 } from "./hr-m8";
import { hrModule9 } from "./hr-m9";
import { hrModule10 } from "./hr-m10";
import { hrModule11 } from "./hr-m11";
import { introModule1 } from "./intro-m1";
import { introModule2 } from "./intro-m2";
import { introModule3 } from "./intro-m3";
import { introModule4 } from "./intro-m4";
import { introModule5 } from "./intro-m5";
import { introModule6 } from "./intro-m6";
import { introModule7 } from "./intro-m7";
import { introModule8 } from "./intro-m8";
import { introModule9 } from "./intro-m9";
import { misModule1 } from "./mis-m1";
import { misModule2 } from "./mis-m2";
import { misModule3 } from "./mis-m3";
import { misModule4 } from "./mis-m4";
import { misModule5 } from "./mis-m5";
import { misModule6 } from "./mis-m6";

export const rangkumanContent: Record<string, Record<string, string>> = {
  marketing: {
    "Modul 1: Marketing - Creating Customer Value": marketingModule1,
    "Modul 2: Company & Marketing Strategy": marketingModule2,
    "Modul 3: Analyzing the Marketing Environment": marketingModule3,
    "Modul 4: Managing Marketing Information": marketingModule4,
    "Modul 5: Consumer Markets & Buyer Behavior": marketingModule5,
    "Modul 6: Business Markets & B2B Behavior": marketingModule6,
    "Modul 7: Customer Value-Driven Strategy (STP)": marketingModule7,
    "Modul 8: Products, Services & Brands": marketingModule8,
    "Modul 9: Pricing Strategies": marketingModule9,
  },
  hr: {
    "Modul 1: Introduction to HRM": hrModule1,
    "Modul 2: Job Analysis & Talent Management": hrModule2,
    "Modul 3: Personnel Planning, Recruiting & Selection": hrModule3,
    "Modul 4: Interviewing Candidates (I & II)": hrModule4,
    "Modul 5: Training and Development": hrModule5,
    "Modul 6: Equal Opportunity & the Law": hrModule6,
    "Modul 7: Building Positive Employee Relations": hrModule7,
    "Modul 8: Managing Careers and Retention": hrModule8,
    "Modul 9: Business Ethics, CSR, ESG & GCG": hrModule9,
    "Modul 10: Benefits and Services (Total Compensation)": hrModule10,
    "Modul 11: Performance Management and Appraisal": hrModule11,
  },
  intro: {
    "Modul 1: Challenges in the Workplace & Manager's Role": introModule1,
    "Modul 2: Managing Diversity": introModule2,
    "Modul 3: Managing Social Responsibility (CSR)": introModule3,
    "Modul 4: Decision Making (I & II)": introModule4,
    "Modul 5: Planning Work Activities": introModule5,
    "Modul 6: Designing Organizational Structure": introModule6,
    "Modul 7: Creating and Managing Teams": introModule7,
    "Modul 8: Managing Conflict": introModule8,
    "Modul 9: Managing Communication (I & II)": introModule9,
  },
  mis: {
    "Modul 1: Information Systems in Global Business": misModule1,
    "Modul 2: Global E-Business and Collaboration": misModule2,
    "Modul 3: Information Systems, Organizations & Strategy": misModule3,
    "Modul 4: IT Infrastructure & Emerging Technologies": misModule4,
    "Modul 5: Ethics, Privacy & Securing Information Systems": misModule5,
    "Modul 6: Foundations of Business Intelligence (Databases)": misModule6,
  },
};

export function getRangkumanBySubjectId(
  subjectId: string
): Record<string, string> | undefined {
  return rangkumanContent[subjectId];
}
