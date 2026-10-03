import type { SupabaseClient } from "@supabase/supabase-js";

import { displayName } from "@/lib/name";

export interface LeaderboardRow {
  rank: number;
  name: string;
  people: number;
  isYou: boolean;
}

export interface Leaderboard {
  top: LeaderboardRow[];
  /** The viewer's own place. Null when they have nobody yet or are not active. */
  you: { rank: number; people: number } | null;
}

const TOP = 10;

/**
 * The ranking itself, apart from the reads, so it can be checked with plain
 * data. Partners with nobody yet are left out: a list of zeros ranks nothing.
 */
export function rankPartners(
  active: { id: string; account_id: string }[],
  rows: { partner_id: string; created_at: string }[],
  viewerPartnerId: string,
  top = TOP
): {
  shown: { id: string; account_id: string; people: number; rank: number }[];
  you: { rank: number; people: number } | null;
} {
  const tally = new Map<string, { people: number; reachedAt: string }>();
  for (const r of rows) {
    const t = tally.get(r.partner_id) ?? { people: 0, reachedAt: "" };
    t.people += 1;
    if (r.created_at > t.reachedAt) t.reachedAt = r.created_at;
    tally.set(r.partner_id, t);
  }
  const ranked = active
    .filter((p) => (tally.get(p.id)?.people ?? 0) > 0)
    .map((p) => ({ ...p, ...tally.get(p.id)! }))
    .sort((a, b) => b.people - a.people || a.reachedAt.localeCompare(b.reachedAt));
  const yourIndex = ranked.findIndex((p) => p.id === viewerPartnerId);
  return {
    shown: ranked.slice(0, top).map((p, i) => ({
      id: p.id,
      account_id: p.account_id,
      people: p.people,
      rank: i + 1,
    })),
    you: yourIndex === -1 ? null : { rank: yourIndex + 1, people: ranked[yourIndex].people },
  };
}

/**
 * The partner leaderboard (plan, mentor perks): active partners ranked by how
 * many people bought through their code.
 *
 * People, never money. Amounts are between haistudy and each partner; what
 * other partners see is a nickname and a head count. Ties go to whoever got
 * there first, so a place, once reached, is not lost to someone who only
 * caught up.
 *
 * Small on purpose: tens of partners, a few hundred commission rows. Three
 * reads, aggregated by rankPartners rather than in a view nobody else needs.
 */
export async function partnerLeaderboard(
  supabase: SupabaseClient,
  viewerPartnerId: string
): Promise<Leaderboard> {
  const { data: partners } = await supabase
    .from("partners")
    .select("id, account_id")
    .eq("status", "active");
  const active = (partners ?? []) as { id: string; account_id: string }[];
  if (!active.length) return { top: [], you: null };

  const { data: rows } = await supabase
    .from("partner_commissions")
    .select("partner_id, created_at")
    .in(
      "partner_id",
      active.map((p) => p.id)
    )
    .limit(5000);

  const { shown, you } = rankPartners(
    active,
    (rows ?? []) as { partner_id: string; created_at: string }[],
    viewerPartnerId
  );
  if (!shown.length) return { top: [], you: null };

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, nickname, full_name")
    .in(
      "id",
      shown.map((p) => p.account_id)
    );
  const nameOf = new Map(
    ((accounts ?? []) as { id: string; nickname: string | null; full_name: string | null }[]).map(
      (a) => [a.id, displayName({ shortName: a.nickname, name: a.full_name })]
    )
  );

  return {
    top: shown.map((p) => ({
      rank: p.rank,
      name: nameOf.get(p.account_id) ?? "Partner",
      people: p.people,
      isYou: p.id === viewerPartnerId,
    })),
    you,
  };
}
