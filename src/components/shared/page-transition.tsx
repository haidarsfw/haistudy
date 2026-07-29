"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

import { pageEnter } from "@/lib/motion";

/**
 * The small movement between pages.
 *
 * Two navigations are deliberately NOT animated, because animating them looks
 * like a fault rather than a flourish:
 *
 *   The first paint of a document. Fading a whole page up from nothing on
 *   arrival means every full page load opens on an empty background — the
 *   "flash" you get coming back to the landing from checkout. Motion belongs
 *   between two things, and on first paint there is only one.
 *
 *   Back and forward. The browser restores the scroll position at the same
 *   moment, so the page is painted transparent halfway down its own content
 *   and then fades in. Nothing about pressing Back should look like arriving
 *   somewhere new, and the browser already owns that gesture.
 *
 * The pop flag lives at module scope rather than in a ref: there is exactly one
 * PageTransition mounted, and the value has to be readable during the render
 * that decides whether to animate — which is the one thing a ref may not be
 * used for.
 */
let pendingPop = false;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  useEffect(() => {
    const onPop = () => {
      pendingPop = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Derived during render by comparing with the previous path. On the very
  // first render the two are equal, so nothing animates; only a real
  // in-document navigation flips it on.
  const [prevPath, setPrevPath] = useState(pathname);
  const [animate, setAnimate] = useState(false);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    // A popstate fired just before this render means Back or Forward.
    setAnimate(!pendingPop);
  }

  // Cleared after the render that used it, never during — a render has to be
  // able to run twice and reach the same answer.
  useEffect(() => {
    pendingPop = false;
  }, [pathname]);

  // The home page crossfades instead of lifting. Its header is
  // `position: fixed`, and a transformed ancestor becomes the containing block
  // for fixed children, so a lift would drag the header with it.
  const flat = reduced || pathname === "/";

  return (
    <motion.div
      key={pathname}
      variants={pageEnter(flat)}
      initial={animate ? "hidden" : false}
      animate="visible"
    >
      {children}
    </motion.div>
  );
}
