/**
 * Material comments, Google-Docs style (B phase 2, migration 088).
 *
 * A thread is a root comment anchored to a passage of a Rangkuman module, plus
 * replies. Visibility is chosen per root and copied onto its replies:
 *   private — only the author
 *   group   — the members and mentors of one group
 *   period  — everyone with access to the period
 */

export type CommentVisibility = "private" | "group" | "period";

export const COMMENT_EMOJI = ["👍", "❤️", "😂", "🎉", "🤔", "🙏"] as const;
export type CommentEmoji = (typeof COMMENT_EMOJI)[number];

export interface CommentAnchor {
  text: string;
  line: number;
  start: number;
  end: number;
}

export interface MaterialComment {
  id: string;
  parentId: string | null;
  authorName: string;
  isMine: boolean;
  body: string | null;
  anchor: CommentAnchor | null;
  visibility: CommentVisibility;
  groupId: string | null;
  resolvedAt: string | null;
  editedAt: string | null;
  deleted: boolean;
  createdAt: string;
  reactions: { emoji: string; count: number; mine: boolean }[];
}

export const COMMENT_COLUMNS =
  "id, account_id, author_name, parent_id, anchor_text, anchor_line, anchor_start, anchor_end, visibility, group_id, body, resolved_at, edited_at, deleted, created_at, semester, exam_period, jurusan, subject_id, module_id";

export const COMMENT_BODY_MAX = 2000;
export const COMMENT_ANCHOR_MAX = 600;

/** "@Budi" tokens in a comment body, lowercased, without the "@". */
export function mentionsIn(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(/@([\p{L}\p{N}_]{2,30})/gu)) out.add(m[1].toLowerCase());
  return [...out];
}

/** The scope-relative path that opens a thread: `${base}/${path}`. */
export function commentPath(subjectId: string, moduleId: string, rootId: string): string {
  return `subject/${subjectId}?tab=1&module=${encodeURIComponent(moduleId)}&comment=${rootId}`;
}
