import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import { AccountIndexList, AccountSidebar } from "@/components/account/account-chrome";
import { WelcomeStrip } from "@/components/account/welcome-strip";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { activeAccesses, listAccountAccesses } from "@/lib/auth/account-access";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { WA_ADMIN } from "@/lib/payments";
import { scopeLabel, supportHref } from "@/lib/account/labels";

export const metadata: Metadata = {
  title: "Akun",
  description: "Atur data diri, lihat aksesmu, dan kelola perangkat.",
  robots: { index: false, follow: false },
};

/**
 * The index.
 *
 * On a phone this page IS the navigation — six rows, one tap each. On a desktop
 * the sidebar does that job, so the same space carries the one thing worth
 * knowing before you go anywhere: whether you can actually study right now.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  // The layout has already redirected anyone signed out; this read is deduped.
  const account = await getOptionalAccount();
  if (!account) return null;

  const params = await searchParams;

  const supabase = isSupabaseServerConfigured ? createServerClient()! : null;
  const accesses = supabase ? await listAccountAccesses(supabase, account.id) : [];
  const live = activeAccesses(accesses);

  const displayName = account.nickname || account.fullName || "";
  const waHref = supportHref(WA_ADMIN, displayName, account.email);

  return (
    <>
      {/* Only ever visible on the hop straight from signing up. It removes its
          own flag from the URL, so a refresh does not congratulate anyone
          twice. */}
      <WelcomeStrip
        show={params.welcome === "1"}
        email={account.emailVerifiedAt ? undefined : account.email}
      />

      <div className="gap-12 lg:grid lg:grid-cols-[12rem_1fr]">
        <AccountSidebar current="/account" />

        <div className="min-w-0 space-y-6">
          {/* The state that decides what this page is for. Someone with nothing
              bought needs a shop, not a settings menu. */}
          {live.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground">
                Kamu belum punya akses aktif
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Akunmu sudah jadi. Tinggal pilih paket untuk periode ujian yang kamu mau.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Link
                  href="/#harga"
                  className="brand-gradient-bg inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Beli akses
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/preview"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Coba gratis dulu
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-foreground">
                {live.length === 1
                  ? "Aksesmu aktif"
                  : `${live.length} akses kamu aktif`}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {/* Comma, not a middot. Each label now carries its own colon,
                    and a middot between two of them read as a fourth level of
                    the same name rather than the join between two names. */}
                {live.map((a) => scopeLabel(a.scopeKey)).join(", ")}
              </p>
              <Link
                href="/account/access"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Buka akses
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* The menu itself, phone only. On a desktop the sidebar is already
              showing all six, and printing them twice would be the redundancy
              this restructure was meant to remove. */}
          <div className="lg:hidden">
            <AccountIndexList />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Ada masalah dengan akunmu?
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Chat admin langsung, biasanya dibalas di hari yang sama.
              </p>
            </div>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <MessageCircle className="h-4 w-4" />
              Chat admin
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
