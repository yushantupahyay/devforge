import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "iNeedTools — Need a Tool? We Have It.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const tools = [
  "SQL Generator", "JSON Reader", "Image Converter", "QR Code",
  "Base64", "UUID Generator", "Hash Generator", "Regex Tester",
  "Age Calculator", "Color Tools", "CSV Tools", "JWT Decoder",
];

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a3d 50%, #0c1a3a 100%)",
          fontFamily: "Arial Black, Arial, sans-serif",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: -120, left: -80, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -100, right: -60, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.28) 0%, transparent 70%)", display: "flex" }} />
        <div style={{ position: "absolute", top: 200, right: 200, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(8,145,178,0.2) 0%, transparent 70%)", display: "flex" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "32px 32px", display: "flex" }} />

        <div style={{ display: "flex", flexDirection: "column", padding: "60px 72px", height: "100%", position: "relative", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 52 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(124,58,237,0.6)" }}>
                <span style={{ color: "white", fontSize: 22, fontWeight: 900 }}>Y</span>
              </div>
              <span style={{ color: "white", fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>iNeedTools</span>
            </div>
            <div style={{ padding: "8px 18px", borderRadius: 999, border: "1px solid rgba(124,58,237,0.5)", background: "rgba(124,58,237,0.15)", color: "#c4b5fd", fontSize: 14, fontWeight: 700, display: "flex" }}>
              19 Free Tools · No Sign-up
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginBottom: 36 }}>
            <span style={{ fontSize: 82, fontWeight: 900, lineHeight: 1, color: "#a78bfa", letterSpacing: -3 }}>Need a Tool?</span>
            <span style={{ fontSize: 82, fontWeight: 900, lineHeight: 1, color: "white", letterSpacing: -3 }}>We Have It.</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {tools.map((t, i) => (
              <div key={i} style={{ padding: "7px 16px", borderRadius: 999, background: i % 3 === 0 ? "rgba(124,58,237,0.22)" : i % 3 === 1 ? "rgba(8,145,178,0.18)" : "rgba(219,39,119,0.18)", border: i % 3 === 0 ? "1px solid rgba(124,58,237,0.4)" : i % 3 === 1 ? "1px solid rgba(8,145,178,0.35)" : "1px solid rgba(219,39,119,0.35)", color: i % 3 === 0 ? "#c4b5fd" : i % 3 === 1 ? "#67e8f9" : "#f9a8d4", fontSize: 13, fontWeight: 700, display: "flex" }}>
                {t}
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 8px #a855f7", display: "flex" }} />
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 18, fontWeight: 600, letterSpacing: 0.5 }}>ineedtools.in</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
