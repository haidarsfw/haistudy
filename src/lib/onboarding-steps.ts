export interface OnboardingStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  target: string | null; // CSS selector for spotlight, null = centered modal
  mobileTarget?: string | null; // Override target on mobile
  skipOnMobile?: boolean; // Skip this step on mobile
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    titleKey: "onboarding.welcome_title",
    descriptionKey: "onboarding.welcome_desc",
    target: null,
  },
  {
    id: "sidebar",
    titleKey: "onboarding.sidebar_title",
    descriptionKey: "onboarding.sidebar_desc",
    target: "[data-onboarding='sidebar']",
    skipOnMobile: true,
  },
  {
    id: "dashboard",
    titleKey: "onboarding.dashboard_title",
    descriptionKey: "onboarding.dashboard_desc",
    target: "[data-onboarding='dashboard']",
  },
  {
    id: "subjects",
    titleKey: "onboarding.subjects_title",
    descriptionKey: "onboarding.subjects_desc",
    target: "[data-onboarding='subjects']",
  },
  {
    id: "chat",
    titleKey: "onboarding.chat_title",
    descriptionKey: "onboarding.chat_desc",
    target: "[data-onboarding='chat']",
    mobileTarget: "[data-onboarding='chat-mobile']",
  },
  {
    id: "ai",
    titleKey: "onboarding.ai_title",
    descriptionKey: "onboarding.ai_desc",
    target: "[data-onboarding='ai']",
    // Mobile: spotlight the elevated center AI FAB in the floating dock.
    mobileTarget: "[data-onboarding='ai-mobile']",
  },
  {
    id: "voice",
    titleKey: "onboarding.voice_title",
    descriptionKey: "onboarding.voice_desc",
    target: "[data-onboarding='voice']",
    mobileTarget: "[data-onboarding='voice-mobile']",
  },
  {
    id: "pomodoro",
    titleKey: "onboarding.pomodoro_title",
    descriptionKey: "onboarding.pomodoro_desc",
    target: "[data-onboarding='pomodoro']",
    skipOnMobile: true,
  },
  {
    id: "notifications",
    titleKey: "onboarding.notifications_title",
    descriptionKey: "onboarding.notifications_desc",
    target: "[data-onboarding='notifications']",
    skipOnMobile: true,
  },
  {
    id: "search",
    titleKey: "onboarding.search_title",
    descriptionKey: "onboarding.search_desc",
    target: "[data-onboarding='search']",
    mobileTarget: "[data-onboarding='search-mobile']",
  },
  {
    id: "settings",
    titleKey: "onboarding.settings_title",
    descriptionKey: "onboarding.settings_desc",
    target: "[data-onboarding='settings']",
    mobileTarget: "[data-onboarding='settings-mobile']",
  },
  {
    id: "done",
    titleKey: "onboarding.done_title",
    descriptionKey: "onboarding.done_desc",
    target: null,
  },
];
