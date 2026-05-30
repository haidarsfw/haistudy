// ============================================
// Default avatar - letter-initial SVG, zero network
// ============================================
// Generates a deterministic colored SVG data URL from a name. Used as a
// fallback when a user has no uploaded avatar_url. Same name always yields
// the same color, so the directory stays visually stable.

const PALETTE = [
  ["#0ea5a0", "#0b7d79"],
  ["#5148d7", "#3a33a8"],
  ["#b85c5c", "#8f4444"],
  ["#5b8a5a", "#446644"],
  ["#3d5a80", "#2c425e"],
  ["#7c6a3a", "#5a4d2a"],
  ["#708090", "#54606c"],
  ["#c2674e", "#974d3a"],
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** First letter (uppercase) of the first word, fallback "?". */
export function avatarInitial(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
}

/**
 * Returns a data: URL for an SVG avatar with the name's initial on a
 * deterministic gradient. Safe for <img src>. No network, no canvas.
 */
export function generateDefaultAvatar(name: string | null | undefined, size = 96): string {
  const initial = avatarInitial(name);
  const [c1, c2] = PALETTE[hashString(name ?? "?") % PALETTE.length];
  const gid = `g${hashString((name ?? "?") + size) % 100000}`;
  const fontSize = Math.round(size * 0.45);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#${gid})"/>` +
    `<text x="50%" y="50%" dy=".06em" font-family="Inter, system-ui, sans-serif" font-size="${fontSize}" ` +
    `font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapeXml(initial)}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
