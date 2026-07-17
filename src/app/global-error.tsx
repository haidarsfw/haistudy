"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: it replaces the root layout, so globals.css and the
 * fonts are gone. Everything here is inline and literal on purpose — no tokens,
 * no utility classes, nothing that depends on the stylesheet having loaded.
 *
 * The brand values are duplicated from `.landing-root` in globals.css
 * (--brand-1 #10b981 / --brand-2 #047857) because they cannot be read from here.
 * If the brand gradient changes, change it here too.
 */
const BRAND_GRADIENT = "linear-gradient(135deg, #10b981 0%, #047857 100%)";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 16px",
              borderRadius: 16,
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            Ada yang error
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "#a1a1aa",
              margin: "0 0 20px",
            }}
          >
            Bukan salah kamu. Coba muat ulang dulu, biasanya langsung beres.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              border: "none",
              backgroundImage: BRAND_GRADIENT,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
          {error.digest && (
            <p
              style={{
                margin: "16px 0 0",
                fontSize: 11,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                color: "#71717a",
              }}
            >
              Kode error: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
