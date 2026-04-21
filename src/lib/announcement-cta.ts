// Parses an optional CTA marker embedded in announcement messages.
// Marker format: {{cta:Label Text|/path-or-full-url}}
// Returns the clean message (marker stripped) and the extracted CTA.

export interface AnnouncementCta {
  label: string;
  url: string;
}

const CTA_RE = /\{\{cta:([^|}]+)\|([^}]+)\}\}/;

export function parseAnnouncementCta(raw: string): {
  message: string;
  cta: AnnouncementCta | null;
} {
  const match = raw.match(CTA_RE);
  if (!match) return { message: raw, cta: null };
  const label = match[1].trim();
  const url = match[2].trim();
  const message = raw.replace(CTA_RE, "").trim();
  return { message, cta: { label, url } };
}
