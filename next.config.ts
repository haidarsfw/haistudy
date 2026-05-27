import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
  },
  productionBrowserSourceMaps: false,
  turbopack: {
    root: __dirname,
  },
  // Strip console.log/info/debug in production while keeping console.error
  // and console.warn for runtime visibility in Vercel function logs.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  // Tree-shake non-default packages that ship large entry points
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "@base-ui/react",
      "sonner",
      "date-fns",
      "lucide-react",
      "react-markdown",
    ],
  },
  images: {
    qualities: [60, 75],
    // Supabase-public slide thumbnails are immutable — extend cache TTL
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gvjwxccwuyuhgexypgbn.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/slides/**",
        search: "",
      },
    ],
  },
  async headers() {
    return [
      {
        // Content-addressed chunks under /_next/static/* never change — let
        // browsers cache them forever and skip revalidation entirely.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // Allow mic (voice rooms) and camera (forum image upload / PWA); deny others
            value:
              "microphone=(self), camera=(self), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline' is required because Next.js injects many
              // dynamically-generated inline scripts (hydration data, chunk
              // loaders, request IDs via self.__next_r). A single sha256 of
              // layout.tsx's theme-init script can't cover those, and a
              // nonce CSP via proxy.ts would force every page out of static
              // prerendering. Lighthouse BP loses ~5 points but site works.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://gvjwxccwuyuhgexypgbn.supabase.co https://lh3.googleusercontent.com https://*.googleusercontent.com https://res.cloudinary.com",
              "media-src 'self' blob: https://gvjwxccwuyuhgexypgbn.supabase.co https://res.cloudinary.com",
              "connect-src 'self' https://gvjwxccwuyuhgexypgbn.supabase.co wss://gvjwxccwuyuhgexypgbn.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://va.vercel-scripts.com https://vitals.vercel-insights.com https://generativelanguage.googleapis.com https://api.openai.com https://api.cloudinary.com",
              "worker-src 'self' blob:",
              // frame-src controls who WE can embed (Google Slides/Drive viewers
              // for MateriTab; YouTube for video lessons). Distinct from
              // frame-ancestors below which controls who can embed US.
              "frame-src 'self' https://docs.google.com https://drive.google.com https://www.youtube.com https://www.youtube-nocookie.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
