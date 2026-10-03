/**
 * Module markers (B phase 2): 🔖 "mau dibahas" and ✅ "sudah", per person,
 * plus the group's 📌 "dijadwalkan" / ✅ "dibahas di sesi" worked out from
 * session agendas.
 */

/**
 * A module's stable id: "m3" from "Modul 3: Aggregate Planning", so renaming
 * a module keeps its markers (a title used as the key is what made highlights
 * vanish in 7eb77a2). Titles without a number fall back to a slug.
 */
export function moduleIdOf(title: string): string {
  const n = title.match(/^Modul\w*\s+(\d+)/i)?.[1];
  if (n) return `m${Number(n)}`;
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "modul"
  );
}

export type MarkStatus = "want" | "done";

export interface GroupModuleState {
  moduleId: string;
  /** scheduled = in an upcoming session's agenda; done = covered in a finished one. */
  state: "scheduled" | "done";
  sessionTitle: string;
  startsAt: string;
}
