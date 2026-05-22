// ============================================
// Scope-prefixed Realtime channel names
// ============================================
// Format: <scope-key>:<surface>:<id?>
// e.g. "s2-uas-bm:chat:global", "s2-uas-bm:support:msgs:H7K49"
//
// Why prefix every channel: Supabase Realtime broadcasts on row inserts to
// every subscriber on the channel. Without per-scope channel names, a chat
// insert in UTS scope would notify UAS subscribers — defeats isolation.
//
// Subscribers ALSO filter by `semester` in postgres_changes config
// (Realtime supports a single `filter` clause), then post-filter
// exam_period+jurusan client-side from payload.new.

import type { ScopeTuple } from "@/types/scope";
import { scopeKey } from "@/lib/scope";

export function chatChannel(scope: ScopeTuple): string {
  return `${scopeKey(scope)}:chat:global`;
}

export function chatPinsChannel(scope: ScopeTuple): string {
  return `${scopeKey(scope)}:chat:pins`;
}

export function chatUnreadChannel(scope: ScopeTuple, licenseKey: string): string {
  return `${scopeKey(scope)}:chat:unread:${licenseKey}`;
}

export function forumThreadsChannel(scope: ScopeTuple, subjectId: string): string {
  return `${scopeKey(scope)}:forum:threads:${subjectId}`;
}

export function forumCommentsChannel(scope: ScopeTuple, threadId: string): string {
  return `${scopeKey(scope)}:forum:comments:${threadId}`;
}

export function voiceParticipantsChannel(scope: ScopeTuple): string {
  return `${scopeKey(scope)}:voice:participants`;
}

export function notificationsChannel(scope: ScopeTuple, licenseKey: string): string {
  return `${scopeKey(scope)}:notif:${licenseKey}`;
}

export function supportMsgsChannel(scope: ScopeTuple, licenseKey: string): string {
  return `${scopeKey(scope)}:support:msgs:${licenseKey}`;
}

export function supportReactionsChannel(scope: ScopeTuple, licenseKey: string): string {
  return `${scopeKey(scope)}:support:rxn:${licenseKey}`;
}

export function supportReadReceiptsChannel(scope: ScopeTuple, licenseKey: string): string {
  return `${scopeKey(scope)}:support:rcp:${licenseKey}`;
}

export function supportTypingChannel(scope: ScopeTuple, licenseKey: string): string {
  return `${scopeKey(scope)}:support:typing:${licenseKey}`;
}

export function supportPinsChannel(scope: ScopeTuple, licenseKey: string): string {
  return `${scopeKey(scope)}:support:pins:${licenseKey}`;
}

export function supportMutesChannel(scope: ScopeTuple, licenseKey: string): string {
  return `${scopeKey(scope)}:support:mutes:${licenseKey}`;
}

export function supportAllChannel(scope: ScopeTuple): string {
  return `${scopeKey(scope)}:support:all`;
}

export function supportUnreadChannel(scope: ScopeTuple, licenseKey: string): string {
  return `${scopeKey(scope)}:support:unread:${licenseKey}`;
}

export function flagsChannel(scope: ScopeTuple): string {
  return `flags:${scopeKey(scope)}`;
}

/**
 * Common Realtime filter — supabase.channel(name).on(... { filter })
 * supports a single column filter; we filter on `semester` here
 * (cheapest narrowing) and post-filter (exam_period, jurusan)
 * client-side from payload.new.
 */
export function scopeRealtimeFilter(scope: ScopeTuple): string {
  return `semester=eq.${scope.semester}`;
}
