import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Only public landing routes belong in the sitemap. The scoped app is
// auth-gated and intentionally excluded (see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/preview", priority: 0.9, changeFrequency: "weekly" },
    { path: "/payments", priority: 0.8, changeFrequency: "monthly" },
    { path: "/login", priority: 0.7, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/refund", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
