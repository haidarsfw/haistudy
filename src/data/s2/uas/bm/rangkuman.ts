// UAS rangkuman placeholder — populated incrementally during UAS authoring.
// Shape mirrors UTS: { [subjectId]: { [moduleKey]: htmlString } }.
export const rangkumanContent: Record<string, Record<string, string>> = {};

export function getRangkumanBySubjectId(
  subjectId: string
): Record<string, string> | undefined {
  return rangkumanContent[subjectId];
}
