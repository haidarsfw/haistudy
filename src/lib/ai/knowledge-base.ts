import { subjects } from "@/data/subjects";
import { content } from "@/data/content";
import { rangkumanContent } from "@/data/rangkuman";

/**
 * Strip custom HTML-like tags from rangkuman content into plain text.
 */
function stripTags(html: string): string {
  return html
    .replace(/<h[1-3]>/g, "\n## ")
    .replace(/<\/h[1-3]>/g, "")
    .replace(/<bullet>/g, "- ")
    .replace(/<\/bullet>/g, "")
    .replace(/<subtitle>/g, "")
    .replace(/<\/subtitle>/g, "")
    .replace(/<\/?[bi]>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Build knowledge context for a specific subject.
 */
export function getSubjectKnowledge(subjectId: string): string {
  const subject = subjects.find((s) => s.id === subjectId);
  const subjectContent = content[subjectId];

  if (!subject || !subjectContent) return "";

  const parts: string[] = [];

  parts.push(`## Mata Kuliah: ${subject.name}`);
  parts.push(`${subject.description}\n`);

  // Flashcard terms
  if (subjectContent.flashcards.length > 0) {
    parts.push("### Istilah Penting (Flashcards)");
    for (const fc of subjectContent.flashcards) {
      parts.push(`- **${fc.term}**: ${fc.definition}`);
    }
    parts.push("");
  }

  // Kisi-kisi topics
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

  // Quiz Q&A
  if (subjectContent.quiz.length > 0) {
    parts.push("### Contoh Soal Quiz");
    for (const q of subjectContent.quiz) {
      parts.push(`Q: ${q.question}`);
      parts.push(`A: ${q.options[q.answer]} (${q.category})`);
    }
    parts.push("");
  }

  // Rangkuman text
  const rangkuman = rangkumanContent[subjectId];
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
 * Build knowledge context for all subjects (overview).
 */
export function getAllSubjectsOverview(): string {
  const parts: string[] = [];

  parts.push("## Daftar Mata Kuliah\n");
  for (const subject of subjects) {
    const subjectContent = content[subject.id];
    parts.push(`**${subject.name}**: ${subject.description}`);
    if (subjectContent) {
      parts.push(
        `  - ${subjectContent.flashcards.length} flashcards, ${subjectContent.quiz.length} soal quiz, ${subjectContent.kisiKisi.length} topik kisi-kisi`
      );
    }
  }

  // Add all flashcard terms as a quick reference
  parts.push("\n## Semua Istilah Penting\n");
  for (const subject of subjects) {
    const subjectContent = content[subject.id];
    if (!subjectContent) continue;

    parts.push(`### ${subject.name}`);
    for (const fc of subjectContent.flashcards) {
      parts.push(`- **${fc.term}**: ${fc.definition}`);
    }
    parts.push("");
  }

  return parts.join("\n");
}
