import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Geist_Mono, Poppins } from "next/font/google";
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
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
  // Only users who explicitly pick Poppins trigger the font fetch via CSS
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600"],
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
      { url: "/icon" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon" },
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
      className={`${jakartaSans.variable} ${inter.variable} ${poppins.variable} ${geistMono.variable} h-full antialiased`}
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
