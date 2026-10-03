import type { Metadata } from "next";

import { AccountFrame } from "@/components/account/account-chrome";
import { GroupJoin, type GroupJoinState } from "@/components/mentor/group-join";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { parseScopeKey, scopeFullLabel } from "@/lib/scope";

export const metadata: Metadata = {
  title: "Gabung grup — haistudy",
  // A personal invite, not a page to be found by search.
  robots: { index: false, follow: false },
};

const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * Where `/@nama/grup` and the six-letter code both land.
 *
 * Public, because the person holding the link usually has no account yet and
 * should see WHICH group and whose before being asked for anything. Joining
 * still needs an account; this page only decides what to offer.
 *
 * An unknown code, an archived group and a closed invite all read the same:
 * "this invite no longer works". Telling them apart would tell a stranger that
 * a code was once real, which turns blind guessing into a directed search.
 */
export default async function GroupJoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = String(raw ?? "").toUpperCase();
  const account = await getOptionalAccount();

  let state: GroupJoinState = { kind: "invalid" };

  if (CODE_RE.test(code) && isSupabaseServerConfigured) {
    const supabase = createServerClient()!;
    const { data: group } = await supabase
      .from("mentor_groups")
      .select("id, name, semester, exam_period, jurusan, status, invite_open, max_members, owner_account_id")
      .eq("invite_code", code)
      .maybeSingle();

    if (group && group.status === "active" && group.invite_open) {
      const scope = parseScopeKey(`s${group.semester}-${group.exam_period}-${group.jurusan}`);
      const { data: owner } = await supabase
        .from("accounts")
        .select("nickname, full_name")
        .eq("id", group.owner_account_id as string)
        .maybeSingle();
      const base = {
        code,
        groupId: group.id as string,
        name: group.name as string,
        mentor: ((owner?.nickname as string) || (owner?.full_name as string) || "mentormu").slice(0, 40),
        period: scope ? scopeFullLabel(scope) : "",
      };

      const { count } = await supabase
        .from("group_members")
        .select("id", { head: true, count: "exact" })
        .eq("group_id", group.id as string)
        .eq("status", "active");
      const full = group.max_members !== null && (count ?? 0) >= (group.max_members as number);

      if (!account) {
        state = { kind: "signed-out", ...base, full };
      } else {
        const { data: member } = await supabase
          .from("group_members")
          .select("status")
          .eq("group_id", group.id as string)
          .eq("account_id", account.id)
          .maybeSingle();
        if (member?.status === "active") state = { kind: "member", ...base };
        else if (member?.status === "pending") state = { kind: "pending", ...base };
        else if (full) state = { kind: "full", ...base };
        else state = { kind: "can-join", ...base };
      }
    }
  }

  return (
    <AccountFrame>
      <GroupJoin state={state} />
    </AccountFrame>
  );
}
