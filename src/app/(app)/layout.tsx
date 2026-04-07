import { AppProviders } from "@/components/providers/app-providers";
import { AppShell } from "./app-shell";
import "katex/dist/katex.min.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
