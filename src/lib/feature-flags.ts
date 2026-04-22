// Cohort shutdown flags. Flip to true to re-enable for next cohort.
// Rationale: paid-API features (Gemini, DeepSeek, LiveKit) are disabled
// at the UI + API layer while env vars stay intact, so the app keeps
// running cheaply between cohorts and re-enabling is a 1-line change.

export const AI_ENABLED = false;
export const VOICE_ENABLED = false;

export const AI_DISABLED_MESSAGE =
  "Fitur AI Chat sementara tidak tersedia karena cohort UTS 2026 sudah selesai. Akan kembali aktif di cohort berikutnya. Sementara ini kamu bisa tetap pakai materi, rangkuman, kisi-kisi, flashcards, quiz, forum, dan fitur lainnya.";

export const VOICE_DISABLED_MESSAGE =
  "Voice Rooms sementara tidak tersedia karena cohort UTS 2026 sudah selesai. Akan kembali aktif di cohort berikutnya.";
