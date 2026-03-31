import { subjects } from "@/data/subjects";
import { content } from "@/data/content";
import { rangkumanContent } from "@/data/rangkuman";

export interface SearchResult {
  type: "subject" | "materi" | "rangkuman" | "kisi-kisi" | "flashcard" | "quiz";
  title: string;
  subtitle?: string;
  subjectId: string;
  subjectName: string;
  tab?: number;
  href: string;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let cachedIndex: SearchResult[] | null = null;

function buildSearchIndex(): SearchResult[] {
  if (cachedIndex) return cachedIndex;

  const results: SearchResult[] = [];

  for (const subject of subjects) {
    // Subject itself
    results.push({
      type: "subject",
      title: subject.name,
      subtitle: subject.description,
      subjectId: subject.id,
      subjectName: subject.name,
      href: `/subject/${subject.id}`,
    });

    const subjectContent = content[subject.id];
    if (!subjectContent) continue;

    // Materi
    for (const m of subjectContent.materi) {
      results.push({
        type: "materi",
        title: m.title,
        subtitle: subject.name,
        subjectId: subject.id,
        subjectName: subject.name,
        tab: 0,
        href: `/subject/${subject.id}?tab=0`,
      });
    }

    // Kisi-Kisi
    for (const k of subjectContent.kisiKisi) {
      results.push({
        type: "kisi-kisi",
        title: k.topic,
        subtitle: `${subject.name} - ${k.items.join(", ")}`,
        subjectId: subject.id,
        subjectName: subject.name,
        tab: 2,
        href: `/subject/${subject.id}?tab=2`,
      });
    }

    // Flashcards
    for (const f of subjectContent.flashcards) {
      results.push({
        type: "flashcard",
        title: f.term,
        subtitle: f.definition,
        subjectId: subject.id,
        subjectName: subject.name,
        tab: 3,
        href: `/subject/${subject.id}?tab=3`,
      });
    }

    // Quiz
    for (const q of subjectContent.quiz) {
      results.push({
        type: "quiz",
        title: q.question,
        subtitle: `${subject.name} - ${q.category}`,
        subjectId: subject.id,
        subjectName: subject.name,
        tab: 4,
        href: `/subject/${subject.id}?tab=4`,
      });
    }

    // Rangkuman
    const subjectRangkuman = rangkumanContent[subject.id];
    if (subjectRangkuman) {
      for (const [moduleTitle, htmlContent] of Object.entries(subjectRangkuman)) {
        results.push({
          type: "rangkuman",
          title: moduleTitle,
          subtitle: `${subject.name} - ${stripTags(htmlContent).slice(0, 80)}...`,
          subjectId: subject.id,
          subjectName: subject.name,
          tab: 1,
          href: `/subject/${subject.id}?tab=1`,
        });
      }
    }
  }

  cachedIndex = results;
  return results;
}

export function searchContent(query: string): SearchResult[] {
  if (!query.trim()) return [];

  const index = buildSearchIndex();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = index
    .map((item) => {
      const haystack = `${item.title} ${item.subtitle || ""} ${item.subjectName}`.toLowerCase();
      let score = 0;

      for (const term of terms) {
        if (haystack.includes(term)) {
          score += 1;
          // Bonus for title match
          if (item.title.toLowerCase().includes(term)) score += 2;
        }
      }

      return { item, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 20).map((s) => s.item);
}
