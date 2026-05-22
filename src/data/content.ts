// Legacy import path. Re-exports default-scope (s2/uts/bm) values for code
// that hasn't been migrated to the scope-aware loader (src/data/index.ts).
// New code should use `loadContent(scope, subjectId)` instead.
export { content, getContentBySubjectId } from "./s2/uts/bm/content";
