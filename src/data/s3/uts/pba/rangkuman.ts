// Scope s3-uts-pba — Semester 3, UTS, Pendidikan Bahasa Arab (UNJ).
// subjectId -> { module title: HTML }. The HTML uses the custom tags
// <h1/h2/h3/bullet/subtitle/warning/img/b/i> parsed by src/lib/content-parser.tsx.
// Empty means the Rangkuman tab hides itself rather than opening blank.
export const rangkumanContent: Record<string, Record<string, string>> = {};

export function getRangkumanBySubjectId(
  subjectId: string
): Record<string, string> | undefined {
  return rangkumanContent[subjectId];
}
