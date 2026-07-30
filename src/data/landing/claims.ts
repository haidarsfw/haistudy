// ============================================
// Numbers haistudy says out loud
// ============================================
//
// Both of these are public claims, and both were written down TWICE — the user
// count sat in social-proof.tsx and again inside an Indonesian string, and the
// rating sat in testimonials.ts and again as a literal in the hero. Change one
// and the front page states two different figures with a straight face.
//
// Neither can be derived from anything in the repo: the count is cumulative
// across periods that predate the database (see the sales history — the first
// two runs were Google Forms), and the rating is an average over feedback
// sheets. So they are hand-maintained on purpose, and the only thing worth
// engineering is that they are hand-maintained in ONE place.

/** Unique students since semester 1, cumulative. Owner-maintained. */
export const USER_COUNT = 312;

/** Average satisfaction across the feedback sheets. Owner-maintained. */
export const TESTIMONIAL_RATING = { value: 4.8, outOf: 5 } as const;
