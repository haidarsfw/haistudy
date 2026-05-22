"use client";

import { useEffect } from "react";

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
    <html>
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
              background: "rgba(239,68,68,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            ⚠️
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            Terjadi Kesalahan
          </h2>
          <p style={{ fontSize: 14, color: "#a1a1aa", margin: "0 0 20px" }}>
            Maaf, terjadi error yang tidak terduga. Coba refresh halaman.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
