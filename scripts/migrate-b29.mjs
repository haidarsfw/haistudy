// ============================================================================
// One-shot migration generator: legacy uasbmb29.xyz (B29 S1 UAS BM) → HaiStudy
// scope `s1-uas-bm`. Reads the legacy pure-data ESM modules and code-generates
// every file under src/data/s1/uas/bm/.
//
// Run:  node scripts/migrate-b29.mjs
//
// Source of truth: /Users/haidarshofwan/binus-b29-uas-prep/src/{db.js,rangkumanContent.js}
// Transform rules: see plan §3. This script is a provenance record of the exact
// transform; it is NOT part of the runtime build.
// ============================================================================

import { writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const LEGACY = "/Users/haidarshofwan/binus-b29-uas-prep";
const OUT = "/Users/haidarshofwan/Projects/haistudy/src/data/s1/uas/bm";

const { DB } = await import(pathToFileURL(`${LEGACY}/src/db.js`).href);
const { RANGKUMAN_CONTENT } = await import(
  pathToFileURL(`${LEGACY}/src/rangkumanContent.js`).href
);

mkdirSync(OUT, { recursive: true });

const SUBJECTS = ["marketing", "hr", "mis", "intro"];

// shortName + color (target Subject requires both; legacy has neither). Plan §3.1.
const META = {
  marketing: { shortName: "Marketing", color: "text-pink-600 dark:text-pink-400" },
  hr: { shortName: "HR Mgmt", color: "text-emerald-600 dark:text-emerald-400" },
  mis: { shortName: "MIS", color: "text-cyan-600 dark:text-cyan-400" },
  intro: { shortName: "Intro Mgmt", color: "text-amber-600 dark:text-amber-400" },
};

// ── helpers ────────────────────────────────────────────────────────────────
const j = (v, indent = 2) => JSON.stringify(v, null, indent);
const write = (name, body) => {
  writeFileSync(`${OUT}/${name}`, body.endsWith("\n") ? body : body + "\n");
};

// materi type map (plan §3.2): slides|gslides → drive-gslides, pdf → drive-pdf.
const mapType = (t) => (t === "pdf" ? "drive-pdf" : "drive-gslides");

// neutralize $-currency so the KaTeX `$...$` parser never triggers (plan §3.5).
// B29 rangkuman uses no real LaTeX; only currency. U+FF04 fullwidth dollar.
const neutralizeDollar = (html) => html.split("$").join("＄");

const stripUpdated = (title) => title.replace(/\s*\(Updated\)\s*$/, "").trim();

// ── per-surface builders ─────────────────────────────────────────────────────
function buildSubjects() {
  return DB.subjects.map((s) => ({
    id: s.id,
    name: s.name,
    shortName: META[s.id].shortName,
    icon: s.icon,
    description: s.description,
    color: META[s.id].color,
  }));
}

function buildMateri(sid) {
  const c = DB.content[sid];
  const out = (c.materi || []).map((m) => {
    const o = { id: m.id, title: m.title, driveId: m.driveId, type: mapType(m.type) };
    if (m.xp != null) o.xp = m.xp;
    return o;
  });
  // mentor PDF (Kak Zarnis) as "Materi Tambahan" — marketing/mis/intro only (plan §3.2).
  const mentor = c.rangkuman?.mentorPPT?.[0];
  if (mentor && mentor.driveId) {
    out.push({
      id: 900,
      title: mentor.title,
      driveId: mentor.driveId,
      type: "drive-pdf",
      xp: 5,
      sectionLabel: "Materi Tambahan — Rangkuman Mentor",
    });
  }
  return out;
}

// "Gabung per topik" — merge kisiKisiTambahan into the matching main topic so
// each concept is ONE accordion. instruction/subtitle become leading items
// (not folded into the title); the empty divider is removed. Explicit map (the
// legacy data is frozen) avoids fragile fuzzy matching.
const MERGE_MAP = {
  marketing: {
    "AIDA Model": "AIDA",
    "Integrated Marketing Communication (IMC)": "IMC (Integrated Marketing Communication)",
  },
  intro: {
    "A. CASE STUDY 1: STARBUCKS (COMPANY SBX)": "Starbucks (Risk & Strategy)",
    "B. CASE STUDY 2: MIXUE": "Mixue (Strategic Evaluation)",
  },
};

// Flatten one source entry's body into a string[] (subtitle + instruction +
// items), preserving every piece of content as a list item.
function kkItems(entry) {
  const items = Array.isArray(entry.items) ? [...entry.items] : [];
  const lead = [];
  if (entry.subtitle) lead.push(entry.subtitle);
  if (entry.instruction) lead.push(entry.instruction);
  return [...lead, ...items];
}

// Returns { items, note }. Source `isHeader` rows become SECTIONS (matching the
// original site's renderer): following numbered (customNumber) sub-topics group
// under their section header. NOTE: essayExam is intentionally dropped — it is
// dead demo data in db.js that the original app never renders anywhere.
function buildKisiKisi(sid) {
  const c = DB.content[sid];
  const order = [];
  const byTopic = new Map();
  const sectionNotes = [];
  let currentSection;
  const ensure = (topic) => {
    if (!byTopic.has(topic)) {
      byTopic.set(topic, { topic, items: [] });
      order.push(topic);
    }
    return byTopic.get(topic);
  };
  const addItems = (target, items) => {
    for (const it of items) if (!target.items.includes(it)) target.items.push(it);
  };

  for (const e of c.kisiKisi || []) {
    if (e.isHeader) {
      currentSection = e.topic;
      if (Array.isArray(e.items) && e.items[0]) sectionNotes.push(e.items[0]);
      continue;
    }
    const item = ensure(e.topic);
    addItems(item, kkItems(e));
    if (currentSection && !item.section) item.section = currentSection;
    if (e.customNumber != null && item.number == null) item.number = String(e.customNumber);
  }

  // tambahan: (1) mapped → merge into its main topic; (2) section-like topic
  // (e.g. "C. TOPIK ESAI ...") → render as its own SECTION with each item split
  // into a numbered sub-topic (matching how A/B sections render); (3) else a
  // plain top-level topic.
  const map = MERGE_MAP[sid] || {};
  (c.kisiKisiTambahan || []).forEach((e) => {
    if (map[e.topic]) {
      addItems(ensure(map[e.topic]), kkItems(e));
      return;
    }
    if (/^[A-Z]\.\s/.test(e.topic)) {
      let n = 0;
      for (const raw of e.items || []) {
        n++;
        const ci = raw.indexOf(": ");
        const subTopic = ci > 0 ? raw.slice(0, ci) : raw;
        const subItems = ci > 0 ? [raw.slice(ci + 2)] : [];
        const item = ensure(subTopic);
        addItems(item, subItems);
        if (!item.section) item.section = e.topic;
        if (item.number == null) item.number = String(n);
      }
      return;
    }
    addItems(ensure(e.topic), kkItems(e));
  });

  let note = c.kisiKisiNote || "";
  if (sectionNotes.length) note = (note ? note + "\n\n" : "") + sectionNotes.join("\n");
  if (c.kisiKisiTambahanNote) note = (note ? note + "\n\n" : "") + c.kisiKisiTambahanNote;

  const items = order.map((t) => {
    const it = byTopic.get(t);
    const out = { topic: it.topic, items: it.items };
    if (it.section) out.section = it.section;
    if (it.number) out.number = it.number;
    return out;
  });
  return { items, note };
}

function buildFlashcards(sid) {
  return (DB.content[sid].flashcards || []).map((f) => ({
    id: f.id,
    term: f.term,
    definition: f.definition,
  }));
}

function buildQuiz(sid) {
  return (DB.content[sid].quiz || []).map((q, i) => ({
    id: q.id != null ? q.id : i + 1,
    question: q.question,
    options: q.options,
    answer: q.answer,
    category: q.category ?? "Umum",
  }));
}

function resolveBody(sid, entry) {
  const block = RANGKUMAN_CONTENT[sid] || {};
  let html = block[entry.contentKey];
  if (html == null && entry.contentKey?.endsWith("_updated")) {
    html = block[entry.contentKey.replace(/_updated$/, "")]; // fallback to original
  }
  if (html == null) throw new Error(`Missing rangkuman body ${sid}/${entry.contentKey}`);
  return html;
}

// returns [{ key, html }] in module order (modulIntiUpdated then addendumUpdated)
function buildModules(sid) {
  const idx = DB.content[sid].rangkuman || {};
  const mods = [];
  for (const e of idx.modulIntiUpdated || []) {
    mods.push({ key: stripUpdated(e.title), html: neutralizeDollar(resolveBody(sid, e)) });
  }
  for (const e of idx.addendumUpdated || []) {
    mods.push({ key: stripUpdated(e.title), html: neutralizeDollar(resolveBody(sid, e)) });
  }
  return mods;
}

// camelCase export prefix per subject (all already valid identifiers)
const camel = (sid) => sid;

// ── emit files ───────────────────────────────────────────────────────────────
const summary = [];

// courses.ts
write(
  "courses.ts",
  `import type { Subject } from "@/types";

export const subjects: Subject[] = ${j(buildSubjects())};

// Legacy alias for compat with existing imports.
export const courses = subjects;

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}
`
);

// {subject}-flashcards.ts + {subject}-quiz.ts
for (const sid of SUBJECTS) {
  const fc = buildFlashcards(sid);
  write(
    `${sid}-flashcards.ts`,
    `import type { FlashcardItem } from "@/types";

export const ${camel(sid)}Flashcards: FlashcardItem[] = ${j(fc)};
`
  );
  const qz = buildQuiz(sid);
  write(
    `${sid}-quiz.ts`,
    `import type { QuizQuestion } from "@/types";

export const ${camel(sid)}Quiz: QuizQuestion[] = ${j(qz)};
`
  );
  summary.push({ sid, flashcards: fc.length, quiz: qz.length });
}

// {subject}-m{N}.ts + assemble rangkuman.ts
const PORTER_GRAFT =
  '\n<h3>Diagram: Porter\'s Five Forces</h3>\n<img src="/porter-five-forces.png" alt="Porter\'s Five Forces Diagram" />\n';

const rangkumanImports = [];
const rangkumanBlocks = [];
let totalModules = 0;

for (const sid of SUBJECTS) {
  const mods = buildModules(sid);
  // Porter image graft into intro's addendum (last module) — plan §3.6.
  if (sid === "intro" && mods.length) {
    mods[mods.length - 1].html += PORTER_GRAFT;
  }
  const blockLines = [];
  mods.forEach((m, idx) => {
    const n = idx + 1;
    const constName = `${camel(sid)}Module${n}`;
    write(`${sid}-m${n}.ts`, `export const ${constName} = ${JSON.stringify(m.html)};\n`);
    rangkumanImports.push(`import { ${constName} } from "./${sid}-m${n}";`);
    blockLines.push(`    ${JSON.stringify(m.key)}: ${constName},`);
  });
  rangkumanBlocks.push(`  ${sid}: {\n${blockLines.join("\n")}\n  },`);
  totalModules += mods.length;
  const s = summary.find((x) => x.sid === sid);
  s.modules = mods.length;
  s.materi = buildMateri(sid).length;
}

write(
  "rangkuman.ts",
  `// Auto-generated from legacy uasbmb29.xyz (B29). Best version only (*_updated).
// HTML uses custom tags <h1/h2/h3/bullet/subtitle/warning/img/b/i> parsed by
// src/lib/content-parser.tsx. Module key = display title shown in the UI.
${rangkumanImports.join("\n")}

export const rangkumanContent: Record<string, Record<string, string>> = {
${rangkumanBlocks.join("\n")}
};

export function getRangkumanBySubjectId(
  subjectId: string
): Record<string, string> | undefined {
  return rangkumanContent[subjectId];
}
`
);

// content.ts
const flashImports = SUBJECTS.map(
  (s) => `import { ${camel(s)}Flashcards } from "./${s}-flashcards";`
).join("\n");
const quizImports = SUBJECTS.map(
  (s) => `import { ${camel(s)}Quiz } from "./${s}-quiz";`
).join("\n");

const contentBlocks = SUBJECTS.map((sid) => {
  const materi = j(buildMateri(sid));
  const { items: kkItemsArr, note: kkNote } = buildKisiKisi(sid);
  return `  ${sid}: {
    materi: ${materi},
    kisiKisi: ${j(kkItemsArr)},
    kisiKisiNote: ${JSON.stringify(kkNote)},
    flashcards: ${camel(sid)}Flashcards,
    quiz: ${camel(sid)}Quiz,
  },`;
}).join("\n\n");

write(
  "content.ts",
  `import type { SubjectContent } from "@/types";
${flashImports}
${quizImports}

// Auto-generated from legacy uasbmb29.xyz (B29 S1 UAS BM).
export const content: Record<string, SubjectContent> = {
${contentBlocks}
};

export function getContentBySubjectId(id: string): SubjectContent | undefined {
  return content[id];
}
`
);

// schedule.ts — exam schedule intentionally EMPTY for this scope. This content
// is for junior cohorts whose UAS dates will differ entirely from B29's, so the
// legacy B29 exam dates are NOT migrated.
const examSchedule = [];

write(
  "schedule.ts",
  `import type { Schedule } from "@/types";

// Legacy B29 had no recurring weekly timetable.
export const weeklySchedule: Schedule[] = [];

export const examSchedule: Schedule[] = ${j(examSchedule)};

export function getNextExam(): Schedule | null {
  const now = new Date();
  const upcoming = examSchedule
    .filter((s) => s.examDate && new Date(s.examDate) > now)
    .sort((a, b) => new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime());
  return upcoming[0] ?? null;
}
`
);

// pinned-threads.ts (forum empty — decision #1)
write(
  "pinned-threads.ts",
  `import type { ForumThread } from "@/types";

// Forum starts empty for this scope; legacy forum held only test data.
export const PINNED_THREADS: Record<string, ForumThread[]> = {};

export function getPinnedThreads(subjectId: string): ForumThread[] {
  return PINNED_THREADS[subjectId] ?? [];
}
`
);

// ── summary + asserts ────────────────────────────────────────────────────────
const EXPECT = {
  marketing: { flashcards: 111, quiz: 130, modules: 6, materi: 6 },
  hr: { flashcards: 55, quiz: 60, modules: 6, materi: 8 },
  mis: { flashcards: 46, quiz: 53, modules: 6, materi: 6 },
  intro: { flashcards: 46, quiz: 60, modules: 5, materi: 13 },
};
let ok = true;
console.log("\n=== migration summary ===");
for (const s of summary) {
  const e = EXPECT[s.sid];
  const pass =
    s.flashcards === e.flashcards &&
    s.quiz === e.quiz &&
    s.modules === e.modules &&
    s.materi === e.materi;
  ok = ok && pass;
  console.log(
    `${pass ? "OK " : "!! "}${s.sid.padEnd(10)} flashcards=${s.flashcards} quiz=${s.quiz} modules=${s.modules} materi=${s.materi}` +
      (pass ? "" : `   EXPECTED ${JSON.stringify(e)}`)
  );
}
const totFlash = summary.reduce((a, s) => a + s.flashcards, 0);
const totQuiz = summary.reduce((a, s) => a + s.quiz, 0);
console.log(`\nΣ flashcards=${totFlash} (expect 258)  quiz=${totQuiz} (expect 303)  modules=${totalModules} (expect 23)`);
console.log(ok && totFlash === 258 && totQuiz === 303 && totalModules === 23 ? "\n✅ ALL COUNTS MATCH" : "\n❌ COUNT MISMATCH");
console.log(`\nWrote files to ${OUT}`);
