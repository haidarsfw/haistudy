"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { easeEnter, NAV } from "@/lib/motion";

/**
 * "Akun berhasil dibuat", shown on whatever page the new account lands on.
 *
 * Someone who got here by clicking a package is in the middle of buying
 * something, and a full congratulations screen in the middle of a checkout is
 * one more place to change your mind. They keep their momentum and get told in
 * a strip instead. Someone who registered with no destination in mind gets the
 * proper success card back on /register, where there is a decision to make.
 *
 * Whether to show it is decided on the SERVER, from `?welcome=1`. Sniffing the
 * URL on the client instead would mean rendering nothing, then rendering the
 * strip a frame later — a hydration mismatch dressed up as a pop-in. All that
 * is left for the browser is scrubbing the flag out of the address bar, so a
 * refresh or a shared link does not congratulate anyone twice.
 */
export function WelcomeStrip({ show, email }: { show: boolean; email?: string }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!show) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("welcome")) return;
    url.searchParams.delete("welcome");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [show]);

  if (!show) return null;

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: reduced ? NAV.reduced : NAV.enter, ease: easeEnter }}
      className="mb-4 flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="text-sm leading-relaxed text-foreground">
        Akun berhasil dibuat.
        {email ? (
          <span className="text-muted-foreground">
            {" "}
            Kami kirim tautan konfirmasi ke {email}.
          </span>
        ) : null}
      </p>
    </motion.div>
  );
}
