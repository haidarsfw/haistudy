import { loadCourses, loadContent, loadRangkuman } from "@/data";
import type { ScopeTuple } from "@/types/scope";
import type { SubjectContent } from "@/types";

/**
 * Strip custom HTML-like tags from rangkuman content into plain text.
 * Preserves slide references as readable citations.
 */
function stripTags(html: string): string {
  return html
    .replace(/<h1>([\s\S]*?)<\/h1>/g, "\n# $1")
    .replace(/<h2>([\s\S]*?)<\/h2>/g, "\n## $1")
    .replace(/<h3>([\s\S]*?)<\/h3>/g, "\n### $1")
    .replace(/<bullet>([\s\S]*?)<\/bullet>/g, "- $1")
    .replace(/<subtitle>([\s\S]*?)<\/subtitle>/g, "$1")
    .replace(/<slide\s+src="[^"]*"\s+alt="([^"]*)"\s*\/>/g, "[Lihat slide: $1]")
    .replace(/<\/?[bi]>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Build knowledge context for a specific subject inside the given scope.
 * Scope-locked: a UAS request never sees UTS materi (and vice versa).
 */
export async function getSubjectKnowledge(
  scope: ScopeTuple,
  subjectId: string
): Promise<string> {
  const [subjectsList, contentMap, rangkumanMap] = await Promise.all([
    loadCourses(scope),
    loadContent(scope) as Promise<Record<string, SubjectContent>>,
    loadRangkuman(scope) as Promise<Record<string, Record<string, string>>>,
  ]);

  const subject = subjectsList.find((s) => s.id === subjectId);
  const subjectContent = contentMap[subjectId];

  if (!subject || !subjectContent) return "";

  const parts: string[] = [];

  parts.push(`## Mata Kuliah: ${subject.name}`);
  parts.push(`${subject.description}\n`);

  if (subjectContent.flashcards.length > 0) {
    parts.push("### Istilah Penting (Flashcards)");
    for (const fc of subjectContent.flashcards) {
      parts.push(`- **${fc.term}**: ${fc.definition}`);
    }
    parts.push("");
  }

  if (subjectContent.kisiKisi.length > 0) {
    parts.push("### Kisi-Kisi Ujian");
    for (const kk of subjectContent.kisiKisi) {
      parts.push(`**${kk.topic}**:`);
      for (const item of kk.items) {
        parts.push(`  - ${item}`);
      }
    }
    parts.push("");
  }

  if (subjectContent.quiz.length > 0) {
    parts.push("### Contoh Soal Quiz");
    for (const q of subjectContent.quiz) {
      parts.push(`Q: ${q.question}`);
      parts.push(`A: ${q.options[q.answer]} (${q.category})`);
    }
    parts.push("");
  }

  const rangkuman = rangkumanMap?.[subjectId];
  if (rangkuman) {
    parts.push("### Rangkuman Materi");
    for (const [title, html] of Object.entries(rangkuman)) {
      parts.push(`\n#### ${title}`);
      parts.push(stripTags(html));
    }
  }

  return parts.join("\n");
}

/**
 * Build knowledge context for all subjects in the scope (overview).
 * Scope-locked.
 */
export async function getAllSubjectsOverview(scope: ScopeTuple): Promise<string> {
  const [subjectsList, contentMap, rangkumanMap] = await Promise.all([
    loadCourses(scope),
    loadContent(scope) as Promise<Record<string, SubjectContent>>,
    loadRangkuman(scope) as Promise<Record<string, Record<string, string>>>,
  ]);

  const parts: string[] = [];

  parts.push("## Daftar Mata Kuliah\n");
  for (const subject of subjectsList) {
    const subjectContent = contentMap[subject.id];
    parts.push(`**${subject.name}**: ${subject.description}`);
    if (subjectContent) {
      parts.push(
        `  - ${subjectContent.flashcards.length} flashcards, ${subjectContent.quiz.length} soal quiz, ${subjectContent.kisiKisi.length} topik kisi-kisi`
      );
    }
  }

  parts.push("\n## Semua Istilah Penting\n");
  for (const subject of subjectsList) {
    const subjectContent = contentMap[subject.id];
    if (!subjectContent) continue;

    parts.push(`### ${subject.name}`);
    for (const fc of subjectContent.flashcards) {
      parts.push(`- **${fc.term}**: ${fc.definition}`);
    }
    parts.push("");
  }

  parts.push("\n## Kisi-Kisi Ujian Per Mata Kuliah\n");
  for (const subject of subjectsList) {
    const subjectContent = contentMap[subject.id];
    if (!subjectContent || subjectContent.kisiKisi.length === 0) continue;

    parts.push(`### ${subject.name}`);
    for (const kk of subjectContent.kisiKisi) {
      parts.push(`**${kk.topic}**: ${kk.items.join("; ")}`);
    }
    parts.push("");
  }

  parts.push("\n## Rangkuman Lengkap Per Mata Kuliah\n");
  for (const subject of subjectsList) {
    const rangkuman = rangkumanMap?.[subject.id];
    if (!rangkuman) continue;

    parts.push(`### ${subject.name}`);
    for (const [title, html] of Object.entries(rangkuman)) {
      parts.push(`\n#### ${title}`);
      parts.push(stripTags(html));
    }
    parts.push("");
  }

  return parts.join("\n");
}
