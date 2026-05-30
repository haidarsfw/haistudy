// Single source of truth for the public site origin used in SEO surfaces
// (robots, sitemap, JSON-LD, canonical/alternates). Prefers the dedicated
// NEXT_PUBLIC_SITE_URL, falls back to the older NEXT_PUBLIC_APP_URL already
// wired in layout.tsx, then the production hostname. No trailing slash.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://haistudy.site"
).replace(/\/+$/, "");
