/** One message in a mentoring group's chat (table group_messages, migration 085). */
export interface GroupMessage {
  id: string;
  groupId: string;
  accountId: string | null;
  authorName: string;
  isMentor: boolean;
  /** null once deleted: the row stays so the conversation keeps its shape. */
  content: string | null;
  quote: string | null;
  quoteSource: string | null;
  deleted: boolean;
  createdAt: string;
}

export const GROUP_MESSAGE_COLUMNS =
  "id, group_id, account_id, author_name, is_mentor, content, quote, quote_source, deleted, created_at";

export const GROUP_MESSAGE_MAX = 2000;
export const GROUP_QUOTE_MAX = 600;
export const GROUP_QUOTE_SOURCE_MAX = 120;

export function toGroupMessage(row: Record<string, unknown>): GroupMessage {
  const deleted = Boolean(row.deleted);
  return {
    id: row.id as string,
    groupId: row.group_id as string,
    accountId: (row.account_id as string | null) ?? null,
    authorName: (row.author_name as string) || "Pengguna",
    isMentor: Boolean(row.is_mentor),
    content: deleted ? null : ((row.content as string) ?? ""),
    quote: deleted ? null : ((row.quote as string | null) ?? null),
    quoteSource: deleted ? null : ((row.quote_source as string | null) ?? null),
    deleted,
    createdAt: row.created_at as string,
  };
}
