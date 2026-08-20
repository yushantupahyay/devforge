import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6d28d9, #a855f7)",
        }}
      >
        <span style={{ color: "white", fontSize: 96, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", letterSpacing: -3 }}>
          Y
        </span>
      </div>
    ),
    { ...size },
  );
}
