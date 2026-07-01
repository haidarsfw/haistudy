import type { CheatsheetFull } from "@/types";

/**
 * Operations Management — full standalone cheat sheet (view-only, protected).
 *
 * Two typeset versions, shown as page IMAGES (WebP) so formatting is preserved
 * exactly and there is no selectable text to copy. The source WebP files live
 * OUTSIDE public/ at `src/content/cheatsheets/opsmgmt/<version>/NN.webp` and are
 * streamed only to logged-in users by the gated route
 * `src/app/api/cheatsheet/[subject]/[version]/[page]/route.ts` — never a public
 * URL. The viewer (`cheatsheet-viewer.tsx`) overlays a per-user watermark so any
 * screenshot is traceable. No download path (yet).
 *
 * Page counts MUST match the files on disk (the route clamps to pageCount):
 *   grafik = 11 pages (1 panduan + 10 materi), tulis = 10 pages.
 */
export const opsmgmtCheatsheetFull: CheatsheetFull = {
  subject: "opsmgmt",
  versions: [
    // "Lengkap" = easy-language + diagrams (11 pages); "Ringkas" = compact,
    // handwritten-style for copying onto 5 A4 sheets (10 pages).
    { id: "grafik", label: "Lengkap", pageCount: 11 },
    { id: "tulis", label: "Ringkas", pageCount: 10 },
    // "Teori Esai" = essay-theory-only cheat sheet (4 pages). Download-only
    // (password PDF); no in-app WebP viewer pages, so downloadOnly hides it
    // from the viewer tabs while keeping it in the download chooser.
    { id: "teori", label: "Teori Esai", pageCount: 4, downloadOnly: true },
  ],
};

/**
 * Server-side registry the gated route uses to validate (subject, version,
 * page) without trusting the URL. Pure data — safe to import from a route
 * handler. Add a subject here when it gains a protected cheat sheet.
 */
export const cheatsheetManifest: Record<string, CheatsheetFull> = {
  opsmgmt: opsmgmtCheatsheetFull,
};
