import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "haistudy — Platform Belajar Pintar Mahasiswa Binus";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1612 0%, #2c1810 50%, #1a1612 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "4px",
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ color: "#c4883a" }}>hai</span>
          <span style={{ color: "#f5efe7" }}>study</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 24,
            fontSize: 28,
            color: "#c4b8a8",
            textAlign: "center",
          }}
        >
          Platform Belajar Pintar Mahasiswa Binus
        </div>

        {/* Features */}
        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 32,
          }}
        >
          {["Materi Lengkap", "Quiz Interaktif", "AI Assistant", "Voice Room"].map(
            (f) => (
              <div
                key={f}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "1px solid rgba(196, 136, 58, 0.3)",
                  color: "#c4b8a8",
                  fontSize: 18,
                }}
              >
                {f}
              </div>
            )
          )}
        </div>

        {/* Bottom tag */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 16,
            color: "#8b7a6b",
          }}
        >
          haistudy.site
        </div>
      </div>
    ),
    { ...size }
  );
}

