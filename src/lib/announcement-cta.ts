// Parses optional markers embedded in announcement messages.
//   CTA:        {{cta:Label Text|/path-or-full-url}}
//   Title:      {{title:Heading shown in the modal}}
//   Modal-only: {{modal}}  → show in the center modal but NOT the header banner
// Returns the clean message (markers stripped) plus the extracted parts.
// All markers are optional and backward compatible (absent → prior behavior).

export interface AnnouncementCta {
  label: string;
  url: string;
}

export interface ParsedAnnouncement {
  message: string;
  cta: AnnouncementCta | null;
  /** Custom modal heading; null → caller uses its default ("Pengumuman baru"). */
  title: string | null;
  /** true → banner should skip this announcement (modal-only, non-intrusive). */
  modalOnly: boolean;
}

const CTA_RE = /\{\{cta:([^|}]+)\|([^}]+)\}\}/;
const TITLE_RE = /\{\{title:([^}]+)\}\}/;
const MODAL_RE = /\{\{modal\}\}/;

export function parseAnnouncementCta(raw: string): ParsedAnnouncement {
  const ctaMatch = raw.match(CTA_RE);
  const cta = ctaMatch
    ? { label: ctaMatch[1].trim(), url: ctaMatch[2].trim() }
    : null;
  const titleMatch = raw.match(TITLE_RE);
  const title = titleMatch ? titleMatch[1].trim() : null;
  const modalOnly = MODAL_RE.test(raw);
  const message = raw
    .replace(CTA_RE, "")
    .replace(TITLE_RE, "")
    .replace(MODAL_RE, "")
    .trim();
  return { message, cta, title, modalOnly };
}
