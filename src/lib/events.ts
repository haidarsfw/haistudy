/**
 * Custom app events for cross-component communication.
 * Uses the native CustomEvent API to dispatch and listen for events.
 */

export const APP_EVENTS = {
  OPEN_CHAT: "app:open-chat",
  SCROLL_TO_MESSAGE: "app:scroll-to-message",
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
