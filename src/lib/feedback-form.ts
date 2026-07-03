// Post-UAS feedback drive (S2 UAS BM cohort). Pure client-side: no DB, no API,
// no realtime, no presence — zero Supabase/Vercel free-tier cost. The link is a
// public Google Form (safe to hardcode in a public repo; not a secret).
// Gated to the s2-uas-bm scope only — the cohort that just finished UAS. Other
// scopes never render the popup or the header CTA.
export const FEEDBACK_FORM_URL = "https://forms.gle/hWsM8rZ4B9DiWRvp6";
export const FEEDBACK_FORM_SCOPE = "s2-uas-bm";
