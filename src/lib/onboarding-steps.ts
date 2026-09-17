export interface OnboardingStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  target: string | null; // CSS selector for spotlight, null = centered modal
  mobileTarget?: string | null; // Override target on mobile
  skipOnMobile?: boolean; // Skip this step on mobile
}

/**
 * The selector this step will actually spotlight, given the viewport.
 *
 * Shared so the overlay (which measures the element) and the hook (which decides
 * whether the step is worth showing at all) can never disagree about which
 * element a step is about.
 */
export function resolveStepTarget(
  step: OnboardingStep | undefined,
  isMobile: boolean
): string | null {
  if (!step) return null;
  if (isMobile && step.mobileTarget !== undefined) return step.mobileTarget;
  return step.target;
}

/**
 * Three steps, grouped — not twelve features listed one at a time.
 *
 * The old tour walked every button in the shell: sidebar, dashboard, subjects,
 * chat, ai, voice, pomodoro, notifications, search, settings, plus a welcome
 * and a goodbye. Twelve screens, and no way out of them: the "Lewati Tutorial"
 * string existed in both languages and was never rendered.
 *
 * Measured completion falls off a cliff with length — around 72% finish a
 * three-step tour, around 16% finish a seven. Twelve is past the point where
 * the tour teaches anybody anything; it is just a door people cannot open.
 *
 * So: where you are, where you learn, where the people are. Everything else
 * introduces itself when someone actually opens it.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "dashboard",
    titleKey: "onboarding.g_home_title",
    descriptionKey: "onboarding.g_home_desc",
    target: "[data-onboarding='dashboard']",
  },
  {
    id: "belajar",
    titleKey: "onboarding.g_learn_title",
    descriptionKey: "onboarding.g_learn_desc",
    target: "[data-onboarding='subjects']",
  },
  {
    id: "komunitas",
    titleKey: "onboarding.g_social_title",
    descriptionKey: "onboarding.g_social_desc",
    target: "[data-onboarding='chat']",
    mobileTarget: "[data-onboarding='chat-mobile']",
  },
];
