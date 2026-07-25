import type { Metadata } from "next";

import { AuthShell, PurchaseIntent } from "@/components/account/auth-shell";
import { RegisterForm } from "@/components/account/register-form";
import { PACKAGE_LABELS, PACKAGE_PRICES, formatIDR } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Daftar",
  description:
    "Buat akun haistudy. Satu akun dipakai untuk semua periode ujian yang kamu beli.",
  alternates: { canonical: "/register" },
};

function safePath(value?: string): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

/**
 * Pull the package out of `?next=/payments?pkg=vip` so the page can show what
 * the visitor was in the middle of buying.
 */
function packageFromNext(next?: string, explicit?: string): keyof typeof PACKAGE_PRICES | null {
  const raw = explicit ?? next?.split("pkg=")[1]?.split("&")[0];
  if (!raw) return null;
  return raw in PACKAGE_PRICES ? (raw as keyof typeof PACKAGE_PRICES) : null;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; pkg?: string }>;
}) {
  const params = await searchParams;
  const next = safePath(params.next);
  const pkg = packageFromNext(next, params.pkg);

  return (
    <AuthShell
      title={pkg ? "Buat akun untuk lanjut" : "Buat akun"}
      subtitle={
        pkg
          ? "Sebentar saja. Akun ini yang nanti memegang aksesmu, jadi periode berikutnya tinggal masuk dan beli."
          : "Satu akun untuk semua periode ujian yang kamu beli. Daftar dulu, akses dibeli setelahnya."
      }
      intent={
        pkg ? (
          <PurchaseIntent
            packageLabel={PACKAGE_LABELS[pkg]}
            price={formatIDR(PACKAGE_PRICES[pkg])}
          />
        ) : null
      }
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
