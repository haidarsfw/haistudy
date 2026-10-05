"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "@/components/ui/icons";

import { clearStoredSession } from "@/lib/auth/session";

/** Real sign-out. Clears the account session and the access cookies with it. */
export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/account/logout", { method: "POST" });
    } catch {
      /* the cookies are cleared server-side; a failed call still ends here */
    }
    // The session is mirrored into localStorage for instant paint, and the
    // session provider restores from it on mount. Clearing only the cookies
    // let that copy redraw a signed-in state on the very next page load.
    try {
      clearStoredSession();
    } catch {
      /* private mode can refuse storage; the cookies are already gone */
    }
    // Full navigation, not router.push: every provider holding session state
    // has to be torn down, not re-rendered.
    window.location.href = "/";
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Keluar
    </button>
  );
}
