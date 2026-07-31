import { notFound } from "next/navigation";
import { AppProviders } from "@/components/providers/app-providers";
import { ScopeProvider } from "@/components/providers/scope-provider";
import { ScopedDataProvider } from "@/components/providers/scoped-data-provider";
import { NotificationsProvider } from "@/hooks/use-notifications";
import { AppShell } from "./app-shell";
import { cookies } from "next/headers";
import { parseScopePath, isAvailableScope, scopeKey } from "@/lib/scope";
import { isScopeStamped, scopeKeyFromCookie } from "@/lib/auth/scope-cookie";
import { scopeAllowedFor } from "@/lib/auth/scope-entitlement";

export default async function ScopedAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ semester: string; exam: string; jurusan: string }>;
}) {
  const { semester, exam, jurusan } = await params;
  const scope = parseScopePath([semester, exam, jurusan]);
  if (!scope || !isAvailableScope(scope)) {
    notFound();
  }

  // Does this period exist — AND did this person buy it?
  //
  // Only the first half used to be asked here. The second half lived in the
  // browser: ScopeProvider noticed the mismatch and redirected after three
  // seconds. Three seconds is long enough to read the page, screenshot it, or
  // save it, and it disappears entirely with JavaScript off. A licence for
  // Semester 1 UTS could open every Semester 2 UAS subject by typing the URL.
  //
  // Now the page is simply not served. The client-side redirect stays as the
  // friendly version for the case it was written for — an admin browsing, or a
  // stale tab — but it is no longer the thing standing between periods.
  const jar = await cookies();
  const sessionKey = jar.get("hs-session")?.value ?? "";
  const rawScope = jar.get("hs-scope")?.value ?? "";
  const entitled =
    isScopeStamped(rawScope, sessionKey) &&
    scopeKeyFromCookie(rawScope) === scopeKey(scope)
      ? true
      : await scopeAllowedFor(sessionKey, scope);
  if (!entitled) {
    notFound();
  }
  return (
    <AppProviders>
      <ScopeProvider scope={scope}>
        <ScopedDataProvider>
          <NotificationsProvider>
            <AppShell>{children}</AppShell>
          </NotificationsProvider>
        </ScopedDataProvider>
      </ScopeProvider>
    </AppProviders>
  );
}
