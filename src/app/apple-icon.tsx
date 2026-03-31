import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 110,
          letterSpacing: "-4px",
        }}
      >
        <span style={{ color: "#22c55e" }}>h</span>
        <span style={{ color: "#ffffff" }}>s</span>
      </div>
    ),
    { ...size }
  );
}
