"use client";

import { useCallback, useState } from "react";

/**
 * Copy text to system clipboard with a brief "copied" status.
 * `timeoutMs` controls how long `copied` stays true before reverting.
 */
export function useCopyToClipboard(timeoutMs = 1800) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!text) return false;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for older browsers / non-secure contexts
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
          } finally {
            document.body.removeChild(ta);
          }
        }
        setCopied(true);
        setTimeout(() => setCopied(false), timeoutMs);
        return true;
      } catch {
        return false;
      }
    },
    [timeoutMs]
  );

  return { copied, copy };
}
