/**
 * Custom app events for cross-component communication.
 * Uses the native CustomEvent API to dispatch and listen for events.
 */

export const APP_EVENTS = {
  OPEN_CHAT: "app:open-chat",
  SCROLL_TO_MESSAGE: "app:scroll-to-message",
  OPEN_AI: "app:open-ai",
  OPEN_DM: "app:open-dm",
} as const;

/**
 * Dispatch an event to open the chat panel and optionally scroll to a message.
 */
export function openChatToMessage(messageId?: string | null) {
  window.dispatchEvent(
    new CustomEvent(APP_EVENTS.OPEN_CHAT, { detail: { messageId } })
  );

  if (messageId) {
    // Slight delay to allow chat panel to open and render
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(APP_EVENTS.SCROLL_TO_MESSAGE, { detail: { messageId } })
      );
    }, 500);
  }
}

/**
 * Open the AI panel pre-seeded with a reference (selected materi text) so the
 * user can ask about it. The app-shell listener stores the reference and opens
 * the panel; the panel shows a reference banner and focuses the input.
 */
export function openAiWithReference(ref: { text: string; subjectId: string | null }) {
  window.dispatchEvent(new CustomEvent(APP_EVENTS.OPEN_AI, { detail: ref }));
}

/**
 * Open the chat panel's DM tab and start (or resume) a direct conversation with
 * the given license key. The app-shell listener captures the key and opens the
 * panel; chat-panel switches to the DM tab and DmTab opens the thread.
 */
export function openDmTo(licenseKey: string) {
  window.dispatchEvent(
    new CustomEvent(APP_EVENTS.OPEN_DM, { detail: { licenseKey } })
  );
}
