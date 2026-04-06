import { subjects } from "@/data/subjects";
import { content } from "@/data/content";
import { rangkumanContent } from "@/data/rangkuman";

export interface SearchResult {
  type: "materi" | "rangkuman" | "kisi-kisi" | "flashcard";
  title: string;
  subtitle?: string;
  subjectId: string;
  subjectName: string;
  tab?: number;
  href: string;
  moduleKey?: string; // rangkuman module title for deep linking
  matchText?: string; // matched text snippet for highlighting
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract heading-delimited sections from rangkuman HTML content */
function extractRangkumanSections(html: string): { heading: string; text: string }[] {
  const sections: { heading: string; text: string }[] = [];
  // Split by h1/h2/h3 tags
  const parts = html.split(/(?=<h[1-3]>)/);

  for (const part of parts) {
    const headingMatch = part.match(/<h[1-3]>([\s\S]*?)<\/h[1-3]>/);
    const heading = headingMatch ? stripTags(headingMatch[1]) : "";
    const text = stripTags(part);
    if (text.length > 10) {
      sections.push({ heading, text });
    }
  }

  return sections;
}

// Type priority for sorting: higher = shown first
const TYPE_PRIORITY: Record<SearchResult["type"], number> = {
  materi: 30,
  rangkuman: 20,
  "kisi-kisi": 10,
  flashcard: 0,
};

let cachedIndex: SearchResult[] | null = null;

function buildSearchIndex(): SearchResult[] {
  if (cachedIndex) return cachedIndex;

  const results: SearchResult[] = [];

  for (const subject of subjects) {
    const subjectContent = content[subject.id];
    if (!subjectContent) continue;

    // Materi (displayed as "Slides")
    for (const m of subjectContent.materi) {
      results.push({
        type: "materi",
        title: m.title,
        subtitle: subject.name,
        subjectId: subject.id,
        subjectName: subject.name,
        tab: 0,
        href: `/subject/${subject.id}?tab=0&highlight=${encodeURIComponent(m.title)}`,
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

    // Rangkuman — deep-index by section
    const subjectRangkuman = rangkumanContent[subject.id];
    if (subjectRangkuman) {
      for (const [moduleTitle, htmlContent] of Object.entries(subjectRangkuman)) {
        // Module-level entry
        results.push({
          type: "rangkuman",
          title: moduleTitle,
          subtitle: `${subject.name} - ${stripTags(htmlContent).slice(0, 80)}...`,
          subjectId: subject.id,
          subjectName: subject.name,
          tab: 1,
          moduleKey: moduleTitle,
          href: `/subject/${subject.id}?tab=1&module=${encodeURIComponent(moduleTitle)}`,
        });

        // Section-level entries for deep search
        const sections = extractRangkumanSections(htmlContent);
        for (const section of sections) {
          if (!section.heading) continue;
          results.push({
            type: "rangkuman",
            title: section.heading,
            subtitle: `${subject.name} · ${moduleTitle}`,
            subjectId: subject.id,
            subjectName: subject.name,
            tab: 1,
            moduleKey: moduleTitle,
            matchText: section.text.slice(0, 120),
            href: `/subject/${subject.id}?tab=1&module=${encodeURIComponent(moduleTitle)}&highlight=${encodeURIComponent(section.heading)}`,
          });
        }
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
      const haystack = `${item.title} ${item.subtitle || ""} ${item.matchText || ""} ${item.subjectName}`.toLowerCase();
      let score = 0;

      for (const term of terms) {
        if (haystack.includes(term)) {
          score += 1;
          // Bonus for title match
          if (item.title.toLowerCase().includes(term)) score += 2;
          // Bonus for matchText (rangkuman body)
          if (item.matchText?.toLowerCase().includes(term)) score += 1;
        }
      }

      // Add type priority
      if (score > 0) {
        score += TYPE_PRIORITY[item.type];
      }

      return { item, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Deduplicate: for rangkuman, prefer the section match over module-level
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];
  for (const { item } of scored) {
    const key = `${item.type}-${item.subjectId}-${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, 20);
}
