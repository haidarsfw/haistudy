import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { MusicProvider } from "@/components/providers/music-provider";
import { Toaster } from "@/components/ui/toast";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init";
import { JsonLd } from "@/components/seo/json-ld";
import { GlobalErrorHandler } from "@/components/system/global-error-handler";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

// Self-hosted (src/app/fonts, SIL Open Font License). next/font/google fetched
// these from Google at BUILD time, so a slow or failed download failed the
// whole Vercel build (701350b). Latin subset, variable-weight files where
// Google serves one.
//
// Every face carries a size-adjust that makes its lowercase letters as tall as
// Inter's (0.546 em; headings: Plus Jakarta Sans's 0.536 em), so text keeps the
// size it had and a font picked in Settings changes letter shapes, not size.
// Measured from these exact files on 2026-10-04: recompute if a file changes.
// The font-family stack per pick lives in src/lib/fonts.ts.

// haistudy's own pair: Onest for headings, Golos Text for everything else.
const onest = localFont({
  src: [{ path: "./fonts/onest-latin-wght.woff2", weight: "400 800", style: "normal" }],
  variable: "--font-heading",
  display: "swap",
  declarations: [{ prop: "size-adjust", value: "101.7%" }],
});

const golosText = localFont({
  src: [{ path: "./fonts/golos-text-latin-wght.woff2", weight: "400 800", style: "normal" }],
  variable: "--font-body",
  display: "swap",
  declarations: [{ prop: "size-adjust", value: "103%" }],
});

// Timers, keys and links; also the "JetBrains Mono" pick in Settings. Kept for
// what it does here, not as a default (antislop R-06 lists it among the fonts
// AI tools reach for): its digits are tabular, so a running countdown does not
// shift, and 0/O and 1/l stay distinct in referral codes and account numbers.
const jetbrainsMono = localFont({
  src: [{ path: "./fonts/jetbrains-mono-latin-wght.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-jetbrains",
  display: "swap",
  preload: false,
  // Arial metrics would size a monospace face wrongly; fall back to the
  // system's own monospace instead.
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
  declarations: [{ prop: "size-adjust", value: "99.3%" }],
});

// Faces a user can pick in Settings. preload: false, so nobody downloads a
// face they did not choose.
const plusJakarta = localFont({
  src: [{ path: "./fonts/plus-jakarta-sans-latin-wght.woff2", weight: "500 700", style: "normal" }],
  variable: "--font-jakarta",
  display: "swap",
  preload: false,
  declarations: [{ prop: "size-adjust", value: "101.9%" }],
});

const inter = localFont({
  src: [{ path: "./fonts/inter-latin-wght.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

const poppins = localFont({
  src: [
    { path: "./fonts/poppins-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-latin-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
  preload: false,
  declarations: [{ prop: "size-adjust", value: "99.6%" }],
});

const quicksand = localFont({
  src: [{ path: "./fonts/quicksand-latin-wght.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-quicksand",
  display: "swap",
  preload: false,
  declarations: [{ prop: "size-adjust", value: "105.8%" }],
});

// The two serif picks ship real italics: summaries lean on italic text, and a
// slanted serif roman reads as broken.
const lora = localFont({
  src: [
    { path: "./fonts/lora-latin-wght.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/lora-latin-wght-italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-lora",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
  declarations: [{ prop: "size-adjust", value: "109.2%" }],
});

const merriweather = localFont({
  src: [
    { path: "./fonts/merriweather-latin-wght.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/merriweather-latin-wght-italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-merriweather",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
  declarations: [{ prop: "size-adjust", value: "98.3%" }],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lock zoom (maximumScale:1 + userScalable:false). Stops iOS Safari from
  // auto-zooming when a sub-16px input is focused (chat bars, AI chat, etc.)
  // and the resulting "stuck zoomed-in" state. App behaves like a native app.
  maximumScale: 1,
  userScalable: false,
};

// Search-engine ownership verification tokens. Set whichever you have as
// environment variables in Vercel (Production) — each renders its meta tag only
// when present, so unset ones emit nothing:
//   GOOGLE_SITE_VERIFICATION  → <meta name="google-site-verification">
//   BING_SITE_VERIFICATION    → <meta name="msvalidate.01">
//   YANDEX_VERIFICATION       → <meta name="yandex-verification">
const googleSV = process.env.GOOGLE_SITE_VERIFICATION;
const bingSV = process.env.BING_SITE_VERIFICATION;
const yandexSV = process.env.YANDEX_VERIFICATION;
const verification: NonNullable<Metadata["verification"]> = {
  ...(googleSV ? { google: googleSV } : {}),
  ...(yandexSV ? { yandex: yandexSV } : {}),
  ...(bingSV ? { other: { "msvalidate.01": bingSV } } : {}),
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification,
  title: {
    default: "haistudy | Platform belajar all-in-one untuk mahasiswa BINUS",
    template: "%s | haistudy",
  },
  description:
    "Platform belajar pintar untuk mahasiswa BINUS. Materi lengkap, quiz interaktif, AI assistant, flashcards, voice room, dan komunitas belajar.",
  applicationName: "haistudy",
  keywords: [
    "haistudy",
    "hai study",
    "haistudy.site",
    "binus",
    "binus university",
    "platform belajar binus",
    "platform belajar mahasiswa",
    "belajar binus",
    "binus business management",
    "study",
    "belajar",
    "ujian",
    "uts",
    "uas",
    "persiapan ujian binus",
    "rangkuman kuliah binus",
    "kisi-kisi binus",
    "flashcards",
    "quiz",
    "ai belajar",
    "mahasiswa",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "haistudy - Platform Belajar All-in-One untuk Mahasiswa BINUS",
    description:
      "Materi lengkap, quiz interaktif, AI assistant, voice room, dan komunitas belajar untuk mahasiswa BINUS.",
    siteName: "haistudy",
    url: SITE_URL,
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "haistudy - Platform Belajar All-in-One untuk Mahasiswa BINUS",
    description:
      "Materi lengkap, quiz interaktif, AI assistant, voice room, dan komunitas belajar untuk mahasiswa BINUS.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${onest.variable} ${golosText.variable} ${jetbrainsMono.variable} ${plusJakarta.variable} ${inter.variable} ${poppins.variable} ${quicksand.variable} ${lora.variable} ${merriweather.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://gvjwxccwuyuhgexypgbn.supabase.co" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="haistudy" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Theme/font init - runs before hydration so the user's saved
            preferences apply on first paint with zero FOUC. Raw <script>
            in <head> is the lightest primitive: browser parses HTML
            top-down, executes synchronously, continues. Next 16 fires a
            dev-only React warning ("Scripts inside React components are
            never executed when rendering on the client") - informational
            only; the SSR'd HTML executes the script correctly. Reverted
            from next/Script after that primitive measurably hurt mobile
            PageSpeed scores in commit 538c302. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Capture the PWA install prompt globally and early (before hydration),
            so it is never lost when `beforeinstallprompt` fires before the
            InstallBanner mounts post-login. InstallBanner seeds from window.__hsBIP. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__hsBIP=e;});window.addEventListener('appinstalled',function(){window.__hsBIP=null;});",
          }}
        />
        <JsonLd />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <GlobalErrorHandler />
        <ThemeProvider>
          <SessionProvider>
            <SettingsProvider>
              <LanguageProvider>
                <MotionProvider>
                  {/* MusicProvider here (under SessionProvider) so playback
                      survives navigation between the scoped app and /admin, and
                      only stops on logout. */}
                  <MusicProvider>{children}</MusicProvider>
                  <Toaster />
                </MotionProvider>
                <Analytics />
                <SpeedInsights />
              </LanguageProvider>
            </SettingsProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
