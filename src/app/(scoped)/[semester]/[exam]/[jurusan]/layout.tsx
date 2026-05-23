import { notFound } from "next/navigation";
import { AppProviders } from "@/components/providers/app-providers";
import { ScopeProvider } from "@/components/providers/scope-provider";
import { ScopedDataProvider } from "@/components/providers/scoped-data-provider";
import { AppShell } from "./app-shell";
import { parseScopePath, isAvailableScope } from "@/lib/scope";

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
  return (
    <AppProviders>
      <ScopeProvider scope={scope}>
        <ScopedDataProvider>
          <AppShell>{children}</AppShell>
        </ScopedDataProvider>
      </ScopeProvider>
    </AppProviders>
  );
}
