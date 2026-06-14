"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

type Algo = "SHA-256" | "SHA-512" | "SHA-1";

const ALGOS: Algo[] = ["SHA-256", "SHA-512", "SHA-1"];

async function computeHash(text: string, algo: Algo): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(algo, encoded);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

export default function HashGenerator() {
  const [input, setInput]   = useState("Hello, DevForge!");
  const [algo, setAlgo]     = useState<Algo>("SHA-256");
  const [hash, setHash]     = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [upper, setUpper]   = useState(false);

  const generate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const h = await computeHash(input, algo);
      setHash(h);
    } finally { setLoading(false); }
  };

  const copy = async () => {
    const val = upper ? hash.toUpperCase() : hash;
    try { await navigator.clipboard.writeText(val); } catch { /**/ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const displayed = upper ? hash.toUpperCase() : hash;

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#f0fdf4,#ecfdf5 30%,#fff)", padding:"40px 24px 32px" }}>
        <div style={{ maxWidth:800, margin:"0 auto" }}>
          <p className="section-label mb-2" style={{ color:"#059669" }}>Security Tool</p>
          <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#059669,#10b981)" }} />
          <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(28px,4vw,46px)", color:"#0f0a1e" }}>
            Hash <span style={{ background:"linear-gradient(135deg,#059669,#047857)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Generator</span>
          </h1>
          <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15 }}>Generate SHA-256, SHA-512, and SHA-1 hashes using the browser's native Web Crypto API.</p>
        </div>
      </section>

      <div style={{ maxWidth:800, margin:"24px auto 48px", padding:"0 24px", width:"100%" }}>

        {/* algorithm tabs */}
        <div className="tab-row" style={{ marginBottom:16 }}>
          {ALGOS.map(a => (
            <button key={a} onClick={() => setAlgo(a)} className={`tab-btn${algo===a?" active":""}`}
              style={{ color:algo===a?"#059669":undefined, background:algo===a?"rgba(5,150,105,0.1)":undefined, borderColor:algo===a?"rgba(5,150,105,0.3)":undefined }}>
              {a}
            </button>
          ))}
        </div>

        {/* input */}
        <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Input Text</label>
        <textarea className="field field-mono" value={input} onChange={e => setInput(e.target.value)} placeholder="Enter text to hash…" style={{ minHeight:160, borderRadius:12, fontSize:13, marginBottom:12 }} />

        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:20, flexWrap:"wrap" }}>
          <button onClick={generate} disabled={loading||!input.trim()} className="btn btn-primary"
            style={{ background:"linear-gradient(135deg,#059669,#047857)", boxShadow:"0 4px 20px rgba(5,150,105,0.3)", border:"none", opacity:(!input.trim()||loading)?0.6:1 }}>
            {loading ? "Computing…" : `⚡ Generate ${algo} Hash`}
          </button>
          <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:13, fontWeight:600, color:"rgba(15,10,30,0.5)" }}>
            <input type="checkbox" checked={upper} onChange={e => setUpper(e.target.checked)} style={{ accentColor:"#059669" }} />
            Uppercase output
          </label>
        </div>

        {/* output */}
        <div style={{ background:"#f0fdf4", border:"1px solid rgba(5,150,105,0.2)", borderRadius:14, padding:"20px 22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ width:8,height:8,borderRadius:"50%",background:hash?"#059669":"#d1d5db",boxShadow:hash?"0 0 6px rgba(5,150,105,0.5)":"none" }} />
              <span style={{ fontSize:12, fontWeight:700, color:"rgba(15,10,30,0.5)" }}>{algo} · {hash ? displayed.length/2 + " bytes" : "—"}</span>
            </div>
            {hash && (
              <button onClick={copy} style={{ fontSize:11, fontWeight:700, color:copied?"#047857":"#059669", background:"rgba(5,150,105,0.1)", border:"1px solid rgba(5,150,105,0.25)", borderRadius:7, padding:"4px 12px", cursor:"pointer" }}>
                {copied?"✓ Copied!":"Copy Hash"}
              </button>
            )}
          </div>
          <div style={{ fontFamily:"monospace", fontSize:13, color:hash?"#0f0a1e":"rgba(15,10,30,0.3)", wordBreak:"break-all", lineHeight:1.7, letterSpacing:"0.04em" }}>
            {displayed || "Hash output will appear here after generating"}
          </div>
        </div>

        {hash && (
          <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
            {[["Length", displayed.length + " hex chars"], ["Bits", (displayed.length/2*8) + " bits"], ["Algorithm", algo]].map(([k,v]) => (
              <div key={k} style={{ padding:"6px 14px", borderRadius:8, background:"rgba(5,150,105,0.07)", border:"1px solid rgba(5,150,105,0.14)", fontSize:12 }}>
                <span style={{ color:"rgba(15,10,30,0.4)", fontWeight:600 }}>{k}: </span>
                <span style={{ color:"#047857", fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#059669", textDecoration:"none" }}>← Back to DevForge</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(5,150,105,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 DevForge · Hash Generator</p>
      </footer>
    </div>
  );
}
