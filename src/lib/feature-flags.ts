// Cohort shutdown flags. Flip to false to disable paid-API features
// between cohorts. Rationale: Gemini, DeepSeek, LiveKit are disabled
// at the UI + API layer while env vars stay intact, so the app keeps
// running cheaply between cohorts and re-enabling is a 1-line change.

export const AI_ENABLED = true;
export const VOICE_ENABLED = true;

export const AI_DISABLED_MESSAGE =
  "Fitur AI Chat sementara tidak tersedia. Akan kembali aktif di cohort berikutnya. Sementara ini kamu bisa tetap pakai materi, rangkuman, kisi-kisi, flashcards, quiz, forum, dan fitur lainnya.";

export const VOICE_DISABLED_MESSAGE =
  "Voice Rooms sementara tidak tersedia. Akan kembali aktif di cohort berikutnya.";
