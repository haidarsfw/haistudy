import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronRight, MailCheck, ShieldCheck, User } from "lucide-react";

import { SignOutButton } from "@/components/account/account-actions";
import { Wordmark } from "@/components/landing/logo";
import { ACCOUNT_NAV } from "@/lib/account/nav";
import { formatDate } from "@/lib/account/labels";
import { cn } from "@/lib/utils";

/**
 * Who you are, at the top of every account page.
 *
 * Above the navigation rather than inside it: it is not a section you travel
 * to, it is the answer to "whose account is this".
 */
export function AccountIdentity({
  displayName,
  email,
  avatarUrl,
  authProvider,
  emailVerified,
  createdAt,
}: {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  authProvider: "google" | "password";
  emailVerified: boolean;
  createdAt: string;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <User className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground lg:text-2xl">
            {/* Never the email's local part. Someone who has not filled in a
                name yet gets a neutral heading instead of being greeted as
                "akunfotoalkhalifah". */}
            {displayName || "Akun kamu"}
          </h1>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              {authProvider === "google" ? "Masuk lewat Google" : "Email dan password"}
            </span>
            {emailVerified && (
              <span className="inline-flex items-center gap-1.5 text-primary">
                <MailCheck className="h-3.5 w-3.5" />
                Email terkonfirmasi
              </span>
            )}
            <span>Bergabung {formatDate(createdAt)}</span>
          </div>
        </div>
      </div>
      <SignOutButton />
    </header>
  );
}

/** The page frame: home link, wordmark, and the width everything sits in. */
export function AccountFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 lg:px-8 lg:py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Beranda
        </Link>
        <Wordmark className="text-sm" />
      </div>
      {children}
    </div>
  );
}

/**
 * The sticky list of sections, desktop only.
 *
 * Hidden on a phone on purpose. There, the index page IS the menu — showing it
 * again above every sub-page would put six links between someone and the one
 * thing they came to change.
 */
export function AccountSidebar({ current }: { current: string }) {
  // `/account` is not in the list, so on the account home NOTHING was
  // highlighted — six links and no answer to "where am I". What that page
  // actually shows is the access state, the same thing "Akses saya" leads to,
  // so that is the entry it belongs to.
  const aktif = current === "/account" ? "/account/access" : current;

  return (
    <nav aria-label="Bagian akun" className="hidden lg:block">
      <ul className="sticky top-10 flex flex-col gap-0.5">
        {ACCOUNT_NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={aktif === item.href ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                aktif === item.href
                  ? "bg-accent font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * A sub-page: its own heading, and a way back that only a phone needs.
 *
 * On a desktop the sidebar already shows where you are, so a back link there
 * would be a third way to say the same thing.
 */
export function AccountPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <Link
        href="/account"
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline lg:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Akun
      </Link>
      <h2 className="font-display text-lg font-bold text-foreground lg:text-xl">{title}</h2>
      {description && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </div>
  );
}

/**
 * One sub-page, in its two-column place.
 *
 * The grid collapses on a phone and the sidebar hides itself, so the same
 * markup is a settings pane on a desktop and a plain page on a phone.
 */
export function AccountPane({
  current,
  title,
  description,
  children,
}: {
  current: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gap-12 lg:grid lg:grid-cols-[12rem_1fr]">
      <AccountSidebar current={current} />
      <AccountPage title={title} description={description}>
        {children}
      </AccountPage>
    </div>
  );
}

/** The index list. Rows, because on a phone this is the whole navigation. */
export function AccountIndexList() {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {ACCOUNT_NAV.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{item.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {item.hint}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
