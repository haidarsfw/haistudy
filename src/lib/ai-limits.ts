// ============================================
// AI conversation limits per tier
// ============================================
// Caps the number of saved AI conversations. Free users get 3,
// VIP/admin get 10. Enforced both client-side (history hook) and
// server-side (/api/ai/conversations POST).

import { canUseVip, type PackageTier } from "@/lib/tier";

export const FREE_AI_CONVERSATION_LIMIT = 3;
export const VIP_AI_CONVERSATION_LIMIT = 10;

export function aiConversationLimit(
  isAdmin: boolean,
  tier: PackageTier | null | undefined
): number {
  return canUseVip(isAdmin, tier) ? VIP_AI_CONVERSATION_LIMIT : FREE_AI_CONVERSATION_LIMIT;
}
