import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// The authenticated app lives behind license-key auth and carries no public
// SEO value, so we keep the scoped tree, admin, and API out of the index.
// Only the public landing surfaces are crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/s1/",
        "/s2/",
        "/s3/",
        "/s4/",
        "/s5/",
        "/s6/",
        "/s7/",
        "/s8/",
        "/dashboard",
        "/subject",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
