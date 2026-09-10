"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAuthClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/site-url";
import { toast } from "@/components/ui/toast";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M9 3.48c1.69 0 2.84.73 3.49 1.34l2.55-2.49C13.5.99 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.06 6.62 3.48 9 3.48z"
      />
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#FBBC05"
        d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.58-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"
      />
      <path fill="none" d="M0 0h18v18H0z" />
    </svg>
  );
}

/**
 * Where to land after Google comes back.
 *
 * Deliberately a cookie rather than a query param on `redirectTo`: Supabase
 * matches the redirect URL against its allow-list, and appending `?next=` can
 * fail that match depending on how the entry was configured. A short-lived
 * cookie keeps the intent without touching auth config at all.
 */
function rememberNext(next?: string) {
  if (typeof document === "undefined") return;
  // Same-origin paths only. An absolute URL here would be an open redirect.
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
  const base = "hs-next=; path=/; max-age=0; samesite=lax";
  document.cookie = base;
  if (safe) {
    document.cookie = `hs-next=${encodeURIComponent(safe)}; path=/; max-age=600; samesite=lax`;
  }
}

/**
 * Carry a typed referral code across the Google round trip.
 *
 * Same cookie trick as `next`, and for the same reason. Before this, someone
 * who entered a friend's code and then chose Google lost it silently: no
 * error, no record, and the friend never credited.
 */
function rememberReferral(code?: string) {
  if (typeof document === "undefined") return;
  document.cookie = "hs-ref=; path=/; max-age=0; samesite=lax";
  const safe = (code || "").trim().slice(0, 32);
  if (safe) {
    document.cookie = `hs-ref=${encodeURIComponent(safe)}; path=/; max-age=600; samesite=lax`;
  }
}

export function GoogleLoginButton({
  next,
  label,
  referral,
  hint,
}: {
  next?: string;
  label?: string;
  referral?: string;
  /** One line under the button. Used on /register to say what Google saves you. */
  hint?: string;
} = {}) {
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured) return null;

  const onClick = async () => {
    setLoading(true);
    rememberNext(next);
    rememberReferral(referral);
    try {
      const supabase = createAuthClient();
      if (!supabase) {
        toast.error("Supabase belum terkonfigurasi");
        setLoading(false);
        return;
      }
      // Send Google back to the host the browser is ALREADY on, so the PKCE
      // verifier is written and read on one origin.
      //
      // The one exception is a Vercel preview alias (`*.vercel.app`): those
      // rotate per deploy, the verifier lands on an alias the callback never
      // sees, and that was the real "PKCE code verifier not found" hitting
      // users. Those get pinned to the canonical site.
      //
      // This used to switch on `NODE_ENV === "production"`, which is a
      // different question and gave the wrong answer: a production BUILD is not
      // the production SITE. Running `next start` locally set NODE_ENV to
      // production, so signing in on localhost sent Google to haistudy.site —
      // the verifier stayed on localhost, the callback ran on the live site,
      // and the flow died with the exact error it was meant to prevent. It also
      // broke dev.haistudy.site the same way.
      const host = window.location.hostname;
      const isPreviewAlias = host.endsWith(".vercel.app");
      const origin = isPreviewAlias ? SITE_URL : window.location.origin;
      const redirectTo = `${origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        toast.error(error.message || "Login Google gagal");
        setLoading(false);
      }
      // Successful path: Supabase redirects the browser, this code unmounts.
    } catch (err) {
      toast.error((err as Error).message || "Login Google gagal");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        disabled={loading}
        className="w-full h-11 gap-2.5 text-sm font-medium border-border bg-background hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="h-4 w-4" />
        )}
        <span>{loading ? "Membuka Google..." : (label ?? "Lanjut dengan Google")}</span>
      </Button>
      {hint && (
        // Not a sales pitch — a true statement about what the other path costs.
        // Google hands the address over already confirmed, so that route skips
        // the mail entirely. Saying it plainly is the honest way to make the
        // easier path look easier.
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
