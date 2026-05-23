import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, Inter, Geist_Mono, Poppins } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://haistudy.site"
  ),
  title: {
    default: "haistudy | Platform belajar all-in-one untuk mahasiswa BINUS",
    template: "%s | haistudy",
  },
  description:
    "Platform belajar pintar untuk mahasiswa BINUS. Materi lengkap, quiz interaktif, AI assistant, flashcards, voice room, dan komunitas belajar.",
  keywords: [
    "haistudy",
    "binus",
    "study",
    "belajar",
    "ujian",
    "mahasiswa",
  ],
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  openGraph: {
    title: "haistudy — Platform Belajar All-in-One untuk Mahasiswa BINUS",
    description:
      "Materi lengkap, quiz interaktif, AI assistant, voice room, dan komunitas belajar untuk mahasiswa BINUS.",
    siteName: "haistudy",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "haistudy — Platform Belajar All-in-One untuk Mahasiswa BINUS",
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
        {/* Theme/font init — runs before hydration so the user's saved
            preferences apply on first paint with zero FOUC. next/script
            with beforeInteractive is the App Router blessed primitive for
            this; using a raw <script> tag triggers a React warning
            ("Scripts inside React components are never executed…") even
            though the SSR'd version DOES execute. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
        >
          {`(function(){try{var d=JSON.parse(localStorage.getItem("dark"));if(d===false)document.documentElement.classList.remove("dark");else document.documentElement.classList.add("dark");var t=JSON.parse(localStorage.getItem("theme"));if(t)document.documentElement.setAttribute("data-theme",t);var f=JSON.parse(localStorage.getItem("font"));if(f){document.documentElement.setAttribute("data-font",f);var m={jakarta:"var(--font-heading), sans-serif",inter:"var(--font-body), sans-serif",poppins:"var(--font-poppins), sans-serif"};document.documentElement.style.setProperty("--font-sans",m[f]||m.jakarta)}}catch(e){}})()`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <SessionProvider>
            <LanguageProvider>
              <MotionProvider>
                {children}
                <Toaster position="top-right" richColors closeButton />
              </MotionProvider>
              <Analytics />
              <SpeedInsights />
            </LanguageProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
