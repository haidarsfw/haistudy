import { SITE_URL } from "@/lib/site-url";

// Server component: emits WebApplication + Organization structured data as a
// single JSON-LD graph. Rendered once in the root layout so every page carries
// it. No client JS - the <script> ships in the SSR'd HTML.
export function JsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "haistudy",
        url: SITE_URL,
        logo: `${SITE_URL}/icons/icon-512.png`,
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        name: "haistudy",
        url: SITE_URL,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web, Android, iOS",
        description:
          "Platform belajar all-in-one untuk mahasiswa BINUS: materi lengkap, quiz interaktif, AI assistant, flashcards, voice room, dan komunitas belajar.",
        inLanguage: "id-ID",
        publisher: { "@id": `${SITE_URL}/#organization` },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "IDR",
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
