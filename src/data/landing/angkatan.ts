/**
 * Cohorts a student can pick from.
 *
 * A fixed list rather than a free-text box: typed in by hand the same intake
 * arrives as "B29", "b29", "Binus 29" and "angkatan 29", and nothing can group
 * those together afterwards.
 *
 * Two shapes because haistudy is no longer BINUS-only. BINUS labels intakes
 * B29/B30; UNJ and the rest use the calendar year.
 *
 * ⚠️ This list has to be extended by hand each year — a cohort that is missing
 * here simply cannot be selected. Add the next one before intake opens.
 */
export const ANGKATAN_OPTIONS: readonly string[] = [
  "B27",
  "B28",
  "B29",
  "B30",
  "B31",
  "B32",
  "2024",
  "2025",
  "2026",
  "2027",
];
