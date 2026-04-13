/**
 * Convert rangkuman HTML content into speech-ready text sections.
 *
 * Each section corresponds to a heading in the content. Each section
 * contains ordered blocks of plain text with line indices that map
 * back to DOM elements via `data-tts-line` attributes in the rendered
 * content.
 */

import { latexToSpeech } from "./latex-to-speech";

export interface TTSBlock {
  text: string;
  lineIndex: number; // maps to data-tts-line in rendered content
  type: "heading" | "text" | "bullet";
}

export interface TTSSection {
  id: string;
  title: string;
  blocks: TTSBlock[];
}

/** Strip inline HTML tags (<b>, <i>) but keep their text */
function stripInlineTags(text: string): string {
  return text
    .replace(/<b>([\s\S]*?)<\/b>/g, "$1")
    .replace(/<i>([\s\S]*?)<\/i>/g, "$1")
    .replace(/<slide[^/]*\/>/g, "")
    .trim();
}

/** Convert inline content to speech text (strips tags + converts LaTeX) */
function toSpeechText(text: string, lang: "id" | "en"): string {
  let result = stripInlineTags(text);
  // Convert LaTeX: $...$
  result = result.replace(/\$([^$]+)\$/g, (_, latex) =>
    latexToSpeech(latex, lang)
  );
  // Clean up symbols that shouldn't be spoken
  result = result.replace(/&amp;/g, " dan ");
  result = result.replace(/&/g, " dan ");
  result = result.replace(/\s+/g, " ").trim();
  return result;
}

/**
 * Parse rangkuman HTML into TTS sections.
 *
 * The `lineIndex` in each block corresponds to the index in
 * `content.split("\\n")`, which matches the `data-tts-line`
 * attribute added by the modified `parseRangkuman()`.
 */
export function stripForSpeech(
  htmlContent: string,
  lang: "id" | "en" = "id"
): TTSSection[] {
  const lines = htmlContent.split("\n");
  const sections: TTSSection[] = [];
  let current: TTSSection | null = null;
  let sectionIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Skip slide tags — not speakable
    if (/^<slide\s/.test(trimmed)) continue;

    // ── Headings start new sections ──
    const h1 = trimmed.match(/^<h1>([\s\S]*?)<\/h1>$/);
    const h2 = trimmed.match(/^<h2>([\s\S]*?)<\/h2>$/);
    const h3 = trimmed.match(/^<h3>([\s\S]*?)<\/h3>$/);

    const heading = h1 || h2 || h3;
    if (heading) {
      const title = stripInlineTags(heading[1]);
      current = {
        id: `tts-section-${sectionIdx++}`,
        title,
        blocks: [{ text: title + ".", lineIndex: i, type: "heading" }],
      };
      sections.push(current);
      continue;
    }

    // Create default section if content before first heading
    if (!current) {
      current = {
        id: `tts-section-${sectionIdx++}`,
        title: "Pendahuluan",
        blocks: [],
      };
      sections.push(current);
    }

    // ── Bullets ──
    const bullet = trimmed.match(/^<bullet>([\s\S]*?)<\/bullet>$/);
    if (bullet) {
      const text = toSpeechText(bullet[1], lang);
      if (text) {
        current.blocks.push({ text, lineIndex: i, type: "bullet" });
      }
      continue;
    }

    // ── Subtitle ──
    const subtitle = trimmed.match(/^<subtitle>([\s\S]*?)<\/subtitle>$/);
    if (subtitle) {
      const text = toSpeechText(subtitle[1], lang);
      if (text) {
        current.blocks.push({ text, lineIndex: i, type: "text" });
      }
      continue;
    }

    // ── Regular text ──
    const text = toSpeechText(trimmed, lang);
    if (text) {
      current.blocks.push({ text, lineIndex: i, type: "text" });
    }
  }

  // Remove sections with no speakable content
  return sections.filter((s) => s.blocks.length > 0);
}
