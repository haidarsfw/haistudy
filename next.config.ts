import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
  },
  productionBrowserSourceMaps: false,
  turbopack: {
    root: __dirname,
  },
  // Tree-shake non-default packages that ship large entry points
  // (lucide-react is already optimized by Next 16 out of the box)
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "@base-ui/react",
      "sonner",
      "date-fns",
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
              // 'unsafe-inline' needed for theme/font init script in src/app/layout.tsx:105-109. Removed in Phase 8 via nonce.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://gvjwxccwuyuhgexypgbn.supabase.co https://lh3.googleusercontent.com https://*.googleusercontent.com",
              "media-src 'self' blob: https://gvjwxccwuyuhgexypgbn.supabase.co",
              "connect-src 'self' https://gvjwxccwuyuhgexypgbn.supabase.co wss://gvjwxccwuyuhgexypgbn.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://va.vercel-scripts.com https://vitals.vercel-insights.com https://generativelanguage.googleapis.com https://api.openai.com",
              "worker-src 'self' blob:",
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
