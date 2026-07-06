/**
 * Mention detection and notification creation utilities.
 * Parses @username and @all from message text.
 */

export interface MentionMatch {
  username: string;
  isAll: boolean;
}

/**
 * Extract @mentions from text.
 * Supports @username (word chars) and @all.
 */
export function parseMentions(text: string): MentionMatch[] {
  const regex = /@(\w+)/g;
  const mentions: MentionMatch[] = [];
  const seen = new Set<string>();
  let match;

  while ((match = regex.exec(text)) !== null) {
    const username = match[1].toLowerCase();
    if (seen.has(username)) continue;
    seen.add(username);
    mentions.push({
      username,
      isAll: username === "all",
    });
  }

  return mentions;
}

/**
 * Check if text contains any @mentions.
 */
export function hasMentions(text: string): boolean {
  return /@\w+/.test(text);
}

/**
 * Create notification payloads for mentioned users.
 * @param mentions - parsed mentions from text
 * @param senderName - who sent the message
 * @param preview - truncated message preview
 * @param context - "chat" or "forum"
 * @param allUsers - list of { licenseKey, name } for @all resolution
 * @param senderLicenseKey - exclude sender from notifications
 */
export function buildMentionNotifications(
  mentions: MentionMatch[],
  senderName: string,
  preview: string,
  context: "chat" | "forum",
  allUsers: Array<{ licenseKey: string; name: string }>,
  senderLicenseKey: string,
  extra?: { threadId?: string; subjectId?: string; threadTitle?: string }
): Array<{
  licenseKey: string;
  type: "mention" | "mention_all";
  senderName: string;
  preview: string;
  context: "chat" | "forum";
  threadId?: string;
  subjectId?: string;
  threadTitle?: string;
}> {
  const truncatedPreview =
    preview.length > 100 ? preview.slice(0, 100) + "…" : preview;
  const notifications: Array<{
    licenseKey: string;
    type: "mention" | "mention_all";
    senderName: string;
    preview: string;
    context: "chat" | "forum";
    threadId?: string;
    subjectId?: string;
    threadTitle?: string;
  }> = [];

  const hasAll = mentions.some((m) => m.isAll);

  if (hasAll) {
    // @all - notify everyone except sender
    for (const user of allUsers) {
      if (user.licenseKey === senderLicenseKey) continue;
      notifications.push({
        licenseKey: user.licenseKey,
        type: "mention_all",
        senderName,
        preview: truncatedPreview,
        context,
        ...extra,
      });
    }
  } else {
    // Individual @username mentions
    const mentionedNames = new Set(mentions.map((m) => m.username));
    for (const user of allUsers) {
      if (user.licenseKey === senderLicenseKey) continue;
      if (mentionedNames.has(user.name.toLowerCase())) {
        notifications.push({
          licenseKey: user.licenseKey,
          type: "mention",
          senderName,
          preview: truncatedPreview,
          context,
          ...extra,
        });
      }
    }
  }

  return notifications;
}
