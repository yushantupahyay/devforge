"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

type EcLevel = "L" | "M" | "Q" | "H";

const EC_INFO: Record<EcLevel, { label: string; desc: string; color: string }> = {
  L: { label: "Low",     desc: "7% recovery — smallest code",   color: "#059669" },
  M: { label: "Medium",  desc: "15% recovery — recommended",    color: "#0891b2" },
  Q: { label: "Quartile",desc: "25% recovery — logo-friendly",  color: "#d97706" },
  H: { label: "High",    desc: "30% recovery — most resilient", color: "#e11d48" },
};

const SAMPLES = [
  { label: "URL",    value: "https://iNeedTools.tools" },
  { label: "Text",   value: "Hello, World!" },
  { label: "Wi-Fi",  value: "WIFI:T:WPA;S:MyNetwork;P:MyPassword;;" },
  { label: "Email",  value: "mailto:hello@example.com" },
  { label: "Phone",  value: "tel:+1234567890" },
];

/* ══════════════════════════════════════════════════════ */
export default function QrToolsPage() {
  const [text, setText]           = useState("https://iNeedTools.tools");
  const [ecLevel, setEcLevel]     = useState<EcLevel>("M");
  const [darkColor, setDarkColor] = useState("#0f0a1e");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [size, setSize]           = useState(300);
  const [margin, setMargin]       = useState(2);
  const [error, setError]         = useState("");
  const [copied, setCopied]       = useState(false);
  const [ready, setReady]         = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* Generate QR code whenever any setting changes */
  useEffect(() => {
    if (!text.trim()) { setError("Enter text or a URL above."); setReady(false); return; }
    let cancelled = false;

    (async () => {
      try {
        // Dynamic import avoids SSR issues
        const QRCode = (await import("qrcode")).default;
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        await QRCode.toCanvas(canvas, text, {
          width: size,
          margin,
          errorCorrectionLevel: ecLevel,
          color: { dark: darkColor, light: lightColor },
        });
        if (!cancelled) { setError(""); setReady(true); }
      } catch (e) {
        if (!cancelled) {
          setError(String(e).replace(/^Error:\s*/, "").replace("The amount of data is too big to be stored in a QR Code", "Text is too long for this error correction level — try a lower level or shorter text."));
          setReady(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [text, ecLevel, darkColor, lightColor, size, margin]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qrcode_${text.slice(0, 20).replace(/[^a-z0-9]/gi, "_")}.png`;
    a.click();
  }, [ready, text]);

  const copyImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    canvas.toBlob(async blob => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { /* clipboard API may be blocked */ }
    }, "image/png");
  }, [ready]);

  const charCount = text.length;

  return (
    <div style={{ background: "#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg,#f5f3ff,#f0f4ff 50%,#fff)", padding: "36px 40px 28px" }}>
        <p className="section-label mb-2">Generator</p>
        <div className="section-line" style={{ margin: "0 0 12px" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize: "clamp(26px,3.5vw,48px)", color: "#0f0a1e" }}>
          QR Code <span className="text-gradient-purple">Generator</span>
        </h1>
        <p style={{ color: "rgba(15,10,30,0.5)", fontSize: 15, maxWidth: 620 }}>
          Turn any text, URL, Wi-Fi credentials, or phone number into a scannable QR code — customize colours, size, and error-correction, then download as PNG.
        </p>
      </section>

      <div style={{ width: "100%", padding: "28px 40px 56px", flex: 1, boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 36, alignItems: "start", flexWrap: "wrap" }}>

          {/* ── LEFT: controls ── */}
          <div style={{ flex: "0 0 360px", minWidth: 260, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Text input */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(15,10,30,0.4)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  Text / URL / Number
                </label>
                <span style={{ fontSize: 11, fontWeight: 600, color: charCount > 800 ? "#e11d48" : "rgba(15,10,30,0.35)" }}>
                  {charCount} chars
                </span>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste a URL, type text, Wi-Fi credentials…"
                rows={4}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)", fontSize: 13, fontFamily: "monospace", color: "#0f0a1e", background: "#fafbff", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }}
              />

              {/* Sample presets */}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {SAMPLES.map(s => (
                  <button key={s.label} onClick={() => setText(s.value)}
                    style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer", background: "rgba(124,58,237,0.07)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.18)", transition: "all 0.12s" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error correction level */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(15,10,30,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Error Correction
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["L", "M", "Q", "H"] as EcLevel[]).map(lvl => {
                  const info = EC_INFO[lvl];
                  const active = ecLevel === lvl;
                  return (
                    <button key={lvl} onClick={() => setEcLevel(lvl)} style={{
                      padding: "10px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                      background: active ? `${info.color}14` : "#fafbff",
                      border: `1.5px solid ${active ? info.color : "rgba(0,0,0,0.08)"}`,
                      transition: "all 0.15s",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: active ? info.color : "#0f0a1e" }}>{lvl} — {info.label}</div>
                      <div style={{ fontSize: 10, color: "rgba(15,10,30,0.45)", marginTop: 2 }}>{info.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(15,10,30,0.4)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Size</label>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed" }}>{size} px</span>
              </div>
              <input type="range" min={100} max={600} step={10} value={size} onChange={e => setSize(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#7c3aed", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(15,10,30,0.35)", marginTop: 3 }}>
                <span>100 px</span><span>600 px</span>
              </div>
            </div>

            {/* Margin */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(15,10,30,0.4)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Quiet Zone (margin)</label>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed" }}>{margin}</span>
              </div>
              <input type="range" min={0} max={6} step={1} value={margin} onChange={e => setMargin(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#7c3aed", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(15,10,30,0.35)", marginTop: 3 }}>
                <span>0</span><span>6</span>
              </div>
            </div>

            {/* Colors */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(15,10,30,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Colors
              </label>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { label: "Foreground", val: darkColor,  set: setDarkColor  },
                  { label: "Background", val: lightColor, set: setLightColor },
                ].map(({ label, val, set }) => (
                  <div key={label} style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "rgba(15,10,30,0.45)", marginBottom: 5, fontWeight: 600 }}>{label}</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(124,58,237,0.18)", background: "#fafbff", cursor: "pointer" }}>
                      <input type="color" value={val} onChange={e => set(e.target.value)}
                        style={{ width: 28, height: 28, border: "none", borderRadius: 4, padding: 0, cursor: "pointer", background: "none" }} />
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: "#0f0a1e" }}>{val.toUpperCase()}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── RIGHT: preview + download ── */}
          <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>

            {/* Canvas wrapper */}
            <div style={{
              borderRadius: 20, border: "1px solid rgba(124,58,237,0.14)",
              background: lightColor, padding: 20,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 32px rgba(124,58,237,0.08)",
              minWidth: 200, minHeight: 200,
              transition: "background 0.2s",
            }}>
              <canvas
                ref={canvasRef}
                style={{ display: ready ? "block" : "none", borderRadius: 6, maxWidth: "100%" }}
              />
              {!ready && !error && (
                <div style={{ width: Math.min(size, 280), height: Math.min(size, 280), display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(15,10,30,0.25)", fontSize: 14, fontWeight: 600 }}>
                  <span style={{ fontSize: 48 }}>⬛</span>
                </div>
              )}
              {!ready && error && (
                <div style={{ width: 220, height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#e11d48", fontSize: 12, textAlign: "center", fontWeight: 600, padding: 16 }}>
                  <span style={{ fontSize: 36 }}>⚠️</span>
                  {error}
                </div>
              )}
            </div>

            {/* Status / info */}
            {ready && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7, background: `${EC_INFO[ecLevel].color}14`, border: `1px solid ${EC_INFO[ecLevel].color}30`, color: EC_INFO[ecLevel].color }}>
                  ECC {ecLevel} · {EC_INFO[ecLevel].label}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7, background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.14)", color: "#7c3aed" }}>
                  {size} × {size} px
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7, background: "rgba(8,145,178,0.07)", border: "1px solid rgba(8,145,178,0.14)", color: "#0891b2" }}>
                  {charCount} chars
                </span>
              </div>
            )}

            {/* Error bar */}
            {error && ready === false && (
              <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.2)", fontSize: 12, color: "#e11d48", maxWidth: 360, textAlign: "center", lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                onClick={download}
                disabled={!ready}
                style={{ padding: "13px 28px", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: ready ? "pointer" : "not-allowed", background: ready ? "#7c3aed" : "rgba(124,58,237,0.25)", color: "#fff", border: "none", boxShadow: ready ? "0 4px 18px rgba(124,58,237,0.32)" : "none", transition: "all 0.15s" }}
              >
                ⬇ Download PNG
              </button>
              <button
                onClick={copyImage}
                disabled={!ready}
                style={{ padding: "13px 22px", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: ready ? "pointer" : "not-allowed", background: copied ? "rgba(5,150,105,0.1)" : "rgba(124,58,237,0.07)", color: copied ? "#059669" : "#7c3aed", border: `1px solid ${copied ? "rgba(5,150,105,0.25)" : "rgba(124,58,237,0.22)"}`, transition: "all 0.15s" }}
              >
                {copied ? "✓ Copied!" : "⎘ Copy Image"}
              </button>
            </div>

            {/* Tips */}
            <div style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.1)", maxWidth: 400, width: "100%" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#5b21b6", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Tips</div>
              <ul style={{ margin: 0, padding: "0 0 0 14px", fontSize: 12, color: "rgba(15,10,30,0.55)", lineHeight: 1.9 }}>
                <li>Use <strong>H</strong> error correction if you plan to print a logo on top</li>
                <li>Minimum size for reliable scanning is ~200 px</li>
                <li>Keep foreground dark and background light for best scan results</li>
                <li>Wi-Fi format: <code style={{ fontSize: 11, background: "rgba(0,0,0,0.05)", borderRadius: 3, padding: "0 4px" }}>WIFI:T:WPA;S:name;P:pass;;</code></li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 44 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#7c3aed", textDecoration: "none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop: "1px solid rgba(124,58,237,0.1)", fontSize: 13, color: "rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · QR Code Generator</p>
      </footer>
    </div>
  );
}
