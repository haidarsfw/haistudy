import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Geist_Mono, Poppins } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
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
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
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
    default: "haistudy | Platform Belajar UTS BINUS B29",
    template: "%s | haistudy",
  },
  description:
    "Platform belajar pintar untuk mahasiswa BINUS. Materi lengkap, quiz interaktif, AI assistant, flashcards, dan fitur belajar bersama.",
  keywords: [
    "haistudy",
    "binus",
    "B29",
    "UTS",
    "study",
    "business management",
  ],
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  openGraph: {
    title: "haistudy — Platform Belajar Pintar Mahasiswa BINUS",
    description:
      "Materi lengkap, quiz interaktif, AI assistant, dan fitur belajar bersama untuk mahasiswa BINUS.",
    siteName: "haistudy",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "haistudy — Platform Belajar Pintar Mahasiswa BINUS",
    description:
      "Materi lengkap, quiz interaktif, AI assistant, dan fitur belajar bersama untuk mahasiswa BINUS.",
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
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <SessionProvider>
            <LanguageProvider>
              {children}
              <Toaster position="top-right" richColors closeButton />
              <Analytics />
            </LanguageProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
