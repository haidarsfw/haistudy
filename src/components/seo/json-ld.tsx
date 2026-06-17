import { SITE_URL } from "@/lib/site-url";

// Server component: emits WebApplication + Organization structured data as a
// single JSON-LD graph. Rendered once in the root layout so every page carries
// it. No client JS - the <script> ships in the SSR'd HTML.
export function JsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "EducationalOrganization"],
        "@id": `${SITE_URL}/#organization`,
        name: "haistudy",
        alternateName: ["hai study", "haistudy.site"],
        url: SITE_URL,
        logo: `${SITE_URL}/icons/icon-512.png`,
        description:
          "Platform belajar all-in-one untuk mahasiswa BINUS University. Independen, dibuat oleh mahasiswa; tidak terafiliasi dengan BINUS University.",
        sameAs: ["https://instagram.com/haidarsfw"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "haistudy",
        url: SITE_URL,
        inLanguage: "id-ID",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        name: "haistudy",
        url: SITE_URL,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web, Android, iOS",
        description:
          "Platform belajar all-in-one untuk mahasiswa BINUS: materi lengkap, rangkuman, kisi-kisi, quiz interaktif, flashcards, AI study assistant, chat & forum real-time, voice room, dan komunitas belajar — per periode ujian (UTS/UAS).",
        inLanguage: "id-ID",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        featureList: [
          "Materi & rangkuman per mata kuliah",
          "Kisi-kisi ujian",
          "Flashcards interaktif 3D",
          "Quiz berbobot + leaderboard",
          "AI Study Assistant",
          "Global chat & forum real-time",
          "Voice room belajar bareng",
          "Catatan pribadi (Markdown + KaTeX)",
          "Progress tracking & analytics",
          "PWA — installable di Android, iOS, desktop",
        ],
        audience: {
          "@type": "EducationalAudience",
          educationalRole: "student",
          audienceType: "Mahasiswa BINUS University (Business Management)",
        },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "IDR",
          lowPrice: "20000",
          highPrice: "50000",
          offerCount: 4,
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here: no user input, static schema graph.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
