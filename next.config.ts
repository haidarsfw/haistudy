import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permit a real device on the LAN (e.g. an iPhone) to load dev-server
  // assets/HMR without Next's cross-origin dev block. Add the Mac's current
  // LAN IP here if it changes (DHCP). Dev-only; ignored by build/start.
  allowedDevOrigins: ["192.168.100.25", "10.38.53.48"],
  env: {
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
  },
  productionBrowserSourceMaps: false,
  turbopack: {
    root: __dirname,
  },
  // Ship the gated cheat-sheet page images into the /api/cheatsheet/* serverless
  // bundle. They live OUTSIDE public/ on purpose (no open URL) and are read with
  // fs.readFile at runtime, so file-tracing must be told to include them. The
  // key is picomatch-matched (contains:true) against the normalized route path;
  // brackets in the literal route would be misread as a glob class, so use the
  // stable substring "/api/cheatsheet".
  outputFileTracingIncludes: {
    "/api/cheatsheet": ["./src/content/cheatsheets/**/*"],
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
      "date-fns",
      // "lucide-react" REMOVED: lucide-react 0.577 ships per-icon ESM paths and
      // Next 16 auto-optimizes it internally. A manual entry here triggers a
      // Turbopack barrel-rewrite that cross-instantiates icon chunks (e.g.
      // ai-message.tsx pulling ChevronRight via a path it never imports) →
      // "module factory is not available" crash that takes down the whole
      // scoped shell. Not a cache issue; this is the fix.
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
    // Content-addressed chunks under /_next/static/* never change in a
    // production build — cache them forever. In dev, Turbopack rewrites chunk
    // contents on every edit while keeping the same URL, so an immutable header
    // makes the browser/SW serve a stale chunk ("module factory is not
    // available"). Only emit the immutable header in production.
    const staticImmutable =
      process.env.NODE_ENV === "production"
        ? [
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : [];
    return [
      ...staticImmutable,
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // Allow mic (voice rooms) and camera (forum image upload / PWA); deny
            // others. encrypted-media is enabled for self + delegated to the
            // SoundCloud widget origin so the music iframe (allow="encrypted-media")
            // can play DRM-streamed tracks instead of aborting + auto-skipping.
            value:
              'microphone=(self), camera=(self), geolocation=(), interest-cohort=(), encrypted-media=(self "https://w.soundcloud.com")',
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live https://w.soundcloud.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://gvjwxccwuyuhgexypgbn.supabase.co https://lh3.googleusercontent.com https://*.googleusercontent.com https://res.cloudinary.com",
              "media-src 'self' blob: https://gvjwxccwuyuhgexypgbn.supabase.co https://res.cloudinary.com",
              "connect-src 'self' https://gvjwxccwuyuhgexypgbn.supabase.co wss://gvjwxccwuyuhgexypgbn.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://va.vercel-scripts.com https://vitals.vercel-insights.com https://generativelanguage.googleapis.com https://api.openai.com https://api.cloudinary.com https://w.soundcloud.com",
              "worker-src 'self' blob:",
              // frame-src controls who WE can embed (Google Slides/Drive viewers
              // for MateriTab; YouTube for video lessons). Distinct from
              // frame-ancestors below which controls who can embed US.
              "frame-src 'self' https://docs.google.com https://drive.google.com https://accounts.google.com https://content.googleapis.com https://www.youtube.com https://www.youtube-nocookie.com https://w.soundcloud.com",
              // 'self' for our own embeds; vercel.live so the Vercel Live
              // preview toolbar/feedback can frame preview deployments without a
              // frame-ancestors console error after login. (Vercel Live is off
              // in production, so this is preview-only in practice.)
              "frame-ancestors 'self' https://vercel.live",
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
