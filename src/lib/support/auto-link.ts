/**
 * Auto-link plain URLs in text → markdown link syntax.
 * Only http(s):// and www. — javascript: scheme not matched.
 *
 * Used as a pre-processor before rendering with react-markdown so that bare
 * URLs become clickable while users can still write `[label](url)` manually.
 */

const URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<>{}|\\^`]+[^\s<>{}|\\^`.,!?;:'"])/g;

export function autoLinkUrls(text: string): string {
  if (!text) return text;
  // Skip if text already contains a markdown link/image — heuristic to avoid
  // double-wrapping inside existing brackets. We do a per-match check via
  // String.replaceAll and look at surrounding chars.
  return text.replace(URL_REGEX, (match, url, offset, fullText) => {
    // If immediately preceded by `](` — already inside a markdown link
    if (offset >= 2 && fullText.slice(offset - 2, offset) === "](") {
      return match;
    }
    // If preceded by `(` and followed shortly by `)` — possibly url-only inline
    // we still wrap (won't break anything). Skip if explicit `(...)` brackets
    // would be ambiguous: keep simple.
    const href = url.startsWith("www.") ? `https://${url}` : url;
    return `[${url}](${href})`;
  });
}
