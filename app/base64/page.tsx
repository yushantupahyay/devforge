"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

export default function Base64Page() {
  const [mode, setMode]       = useState<"encode"|"decode">("encode");
  const [input, setInput]     = useState("Hello, iNeedTools! 🚀");
  const [urlSafe, setUrlSafe] = useState(false);
  const [copied, setCopied]   = useState(false);

  const output = (() => {
    if (!input.trim()) return "";
    try {
      if (mode === "encode") {
        const b64 = btoa(unescape(encodeURIComponent(input)));
        return urlSafe ? b64.replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"") : b64;
      } else {
        const normalized = urlSafe
          ? input.replace(/-/g,"+").replace(/_/g,"/").padEnd(input.length + (4 - input.length % 4) % 4, "=")
          : input;
        return decodeURIComponent(escape(atob(normalized.trim())));
      }
    } catch {
      return "⚠ Invalid input for " + mode;
    }
  })();

  const copy = async () => {
    try { await navigator.clipboard.writeText(output); } catch { /**/ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const swap = () => {
    setMode(m => m === "encode" ? "decode" : "encode");
    setInput(output);
  };

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#fff0f6,#fdf4ff 50%,#fff)", padding:"40px 24px 32px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <p className="section-label mb-2" style={{ color:"#db2777" }}>Encoding Tool</p>
          <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#db2777,#7c3aed)" }} />
          <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(28px,4vw,46px)", color:"#0f0a1e" }}>
            Base64 <span style={{ background:"linear-gradient(135deg,#db2777,#be185d)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Encoder</span>
          </h1>
          <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15 }}>Encode and decode Base64 strings instantly in your browser.</p>
        </div>
      </section>

      <div style={{ maxWidth:900, margin:"24px auto 48px", padding:"0 24px", width:"100%" }}>
        {/* mode + options */}
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
          <div className="tab-row">
            <button onClick={() => setMode("encode")} className={`tab-btn${mode==="encode"?" active":""}`}>Encode</button>
            <button onClick={() => setMode("decode")} className={`tab-btn${mode==="decode"?" active":""}`}>Decode</button>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:13, fontWeight:600, color:urlSafe?"#db2777":"rgba(15,10,30,0.5)", marginLeft:8 }}>
            <input type="checkbox" checked={urlSafe} onChange={e => setUrlSafe(e.target.checked)} style={{ accentColor:"#db2777" }} />
            URL-safe (no +/= chars)
          </label>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:14, alignItems:"start" }}>
          {/* input */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>
              {mode === "encode" ? "Plain Text" : "Base64 String"}
            </label>
            <textarea className="field field-mono" value={input} onChange={e => setInput(e.target.value)} placeholder={mode==="encode"?"Enter text to encode…":"Enter Base64 to decode…"} style={{ minHeight:280, borderRadius:12, fontSize:13 }} />
            <div style={{ marginTop:6, fontSize:11, color:"rgba(15,10,30,0.35)" }}>{input.length} chars</div>
          </div>

          {/* swap button */}
          <div style={{ paddingTop:28 }}>
            <button onClick={swap} style={{ padding:"10px 14px", borderRadius:10, border:"1px solid rgba(0,0,0,0.1)", background:"#fff", cursor:"pointer", fontSize:18, color:"rgba(15,10,30,0.5)", transition:"all 0.2s" }} title="Swap input ↔ output">⇄</button>
          </div>

          {/* output */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase" }}>
                {mode === "encode" ? "Base64 Output" : "Decoded Text"}
              </label>
              {output && !output.startsWith("⚠") && (
                <button onClick={copy} style={{ fontSize:11, fontWeight:600, color:copied?"#059669":"#db2777", background:copied?"rgba(5,150,105,0.07)":"rgba(219,39,119,0.07)", border:`1px solid ${copied?"rgba(5,150,105,0.2)":"rgba(219,39,119,0.2)"}`, borderRadius:7, padding:"4px 10px", cursor:"pointer" }}>
                  {copied?"✓ Copied!":"Copy"}
                </button>
              )}
            </div>
            <div style={{ background: output.startsWith("⚠") ? "rgba(225,29,72,0.04)" : "#fdf4ff", border:`1px solid ${output.startsWith("⚠")?"rgba(225,29,72,0.18)":"rgba(219,39,119,0.14)"}`, borderRadius:12, padding:"14px 16px", minHeight:280, fontFamily:"monospace", fontSize:13, lineHeight:1.8, wordBreak:"break-all", color: output.startsWith("⚠") ? "#e11d48" : "#0f0a1e", whiteSpace:"pre-wrap" }}>
              {output || <span style={{ color:"rgba(15,10,30,0.3)" }}>Output will appear here</span>}
            </div>
            {output && !output.startsWith("⚠") && <div style={{ marginTop:6, fontSize:11, color:"rgba(15,10,30,0.35)" }}>{output.length} chars</div>}
          </div>
        </div>

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#db2777", textDecoration:"none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(219,39,119,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · Base64 Encoder</p>
      </footer>
    </div>
  );
}
