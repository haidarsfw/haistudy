// Legacy import path. Re-exports default-scope (s2/uts/bm) values for code
// that hasn't been migrated to the scope-aware loader (src/data/index.ts).
// New code should use `loadSchedule(scope)` instead.
export { weeklySchedule, examSchedule, getNextExam } from "./s2/uts/bm/schedule";
