import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: "-1px",
        }}
      >
        <span style={{ color: "#22c55e" }}>h</span>
        <span style={{ color: "#ffffff" }}>s</span>
      </div>
    ),
    { ...size }
  );
}
