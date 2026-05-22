import type { SubjectContent } from "@/types";

/**
 * UAS S2 BM content — materi, kisi-kisi, flashcards, quiz per subject.
 * Content will be populated incrementally as UAS materials are authored.
 * Subject pages handle empty arrays with graceful "Materi belum tersedia" fallbacks.
 */
export const content: Record<string, SubjectContent> = {
  bizethics: {
    materi: [],
    kisiKisi: [],
    kisiKisiNote: "",
    flashcards: [],
    quiz: [],
  },

  opsmgmt: {
    materi: [],
    kisiKisi: [],
    kisiKisiNote: "",
    flashcards: [],
    quiz: [],
  },

  akuntansi: {
    materi: [],
    kisiKisi: [],
    kisiKisiNote: "",
    flashcards: [],
    quiz: [],
  },

  foundai: {
    materi: [],
    kisiKisi: [],
    kisiKisiNote: "",
    flashcards: [],
    quiz: [],
  },
};

export function getContentBySubjectId(id: string): SubjectContent | undefined {
  return content[id];
}
