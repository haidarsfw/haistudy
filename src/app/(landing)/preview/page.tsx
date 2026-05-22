"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { DEFAULT_SCOPE, scopeKey } from "@/lib/scope";

/**
 * Preview mode entry point.
 * Creates a preview session and redirects to dashboard.
 * No login required - uses isPreview flag.
 */
export default function PreviewPage() {
  const router = useRouter();
  const { login } = useSession();

  useEffect(() => {
    // Create preview session
    login({
      licenseKey: "PREVIEW",
      name: "Preview User",
      isAdmin: false,
      isTester: false,
      expiry: null,
      selectedClass: "LE86",
      isPreview: true,
      packageTier: "normal",
      scope: DEFAULT_SCOPE,
      scopeKey: scopeKey(DEFAULT_SCOPE),
    });

    // Set session cookie for proxy
    document.cookie = "hs-session=1; path=/; max-age=3600; SameSite=Lax";
    document.cookie = `hs-scope=${scopeKey(DEFAULT_SCOPE)}; path=/; max-age=3600; SameSite=Lax`;

    router.push("/dashboard");
  }, [login, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">
          Memuat preview...
        </p>
        <p className="text-[11px] text-muted-foreground/60">
          Tanpa login, fitur terbatas.
        </p>
      </div>
    </div>
  );
}
