"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

export default function UuidGenerator() {
  const [count, setCount]   = useState(5);
  const [uuids, setUuids]   = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number|"all"|null>(null);

  const generate = () => {
    const n = Math.max(1, Math.min(100, count));
    setUuids(Array.from({ length: n }, () => crypto.randomUUID()));
  };

  const copyOne = async (uuid: string, idx: number) => {
    try { await navigator.clipboard.writeText(uuid); } catch { /**/ }
    setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = async () => {
    try { await navigator.clipboard.writeText(uuids.join("\n")); } catch { /**/ }
    setCopiedIdx("all"); setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#fffbeb,#fef3c7 30%,#fff)", padding:"40px 24px 32px" }}>
        <div style={{ maxWidth:800, margin:"0 auto" }}>
          <p className="section-label mb-2" style={{ color:"#d97706" }}>Generate Tool</p>
          <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#d97706,#f59e0b)" }} />
          <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(28px,4vw,46px)", color:"#0f0a1e" }}>
            UUID <span style={{ background:"linear-gradient(135deg,#d97706,#b45309)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Generator</span>
          </h1>
          <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15 }}>Cryptographically secure v4 UUIDs — generated locally, never sent to a server.</p>
        </div>
      </section>

      <div style={{ maxWidth:800, margin:"24px auto 48px", padding:"0 24px", width:"100%" }}>
        {/* controls */}
        <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <label style={{ fontSize:13, fontWeight:600, color:"rgba(15,10,30,0.55)" }}>Count:</label>
            <input type="number" value={count} onChange={e => setCount(parseInt(e.target.value)||1)} min={1} max={100}
              style={{ width:72, padding:"8px 12px", borderRadius:9, border:"1px solid rgba(0,0,0,0.12)", fontSize:14, fontWeight:700, textAlign:"center", outline:"none" }} />
            <span style={{ fontSize:12, color:"rgba(15,10,30,0.35)" }}>(1–100)</span>
          </div>
          <button onClick={generate} className="btn btn-primary" style={{ background:"linear-gradient(135deg,#d97706,#b45309)", boxShadow:"0 4px 20px rgba(217,119,6,0.3)", border:"none" }}>
            ⚡ Generate UUIDs
          </button>
          {uuids.length > 0 && (
            <button onClick={copyAll} style={{ padding:"9px 18px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", background:copiedIdx==="all"?"rgba(5,150,105,0.08)":"rgba(217,119,6,0.08)", color:copiedIdx==="all"?"#059669":"#d97706", border:`1px solid ${copiedIdx==="all"?"rgba(5,150,105,0.2)":"rgba(217,119,6,0.2)"}` }}>
              {copiedIdx==="all" ? "✓ Copied all!" : `Copy All (${uuids.length})`}
            </button>
          )}
        </div>

        {/* list */}
        {uuids.length > 0 ? (
          <div style={{ borderRadius:14, border:"1px solid rgba(217,119,6,0.18)", overflow:"hidden" }}>
            {uuids.map((uuid, i) => (
              <div key={uuid} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderBottom: i < uuids.length-1 ? "1px solid rgba(217,119,6,0.1)" : "none", background:i%2===0?"#ffffff":"rgba(217,119,6,0.025)", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.28)", minWidth:20 }}>{i+1}</span>
                  <span style={{ fontFamily:"monospace", fontSize:14, color:"#0f0a1e", letterSpacing:"0.03em" }}>{uuid}</span>
                </div>
                <button onClick={() => copyOne(uuid, i)} style={{ flexShrink:0, padding:"4px 12px", borderRadius:7, border:`1px solid ${copiedIdx===i?"rgba(5,150,105,0.25)":"rgba(217,119,6,0.22)"}`, background:copiedIdx===i?"rgba(5,150,105,0.07)":"rgba(217,119,6,0.07)", color:copiedIdx===i?"#059669":"#b45309", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  {copiedIdx===i ? "✓" : "Copy"}
                </button>
              </div>
            ))}
            <div style={{ padding:"8px 16px", borderTop:"1px solid rgba(217,119,6,0.1)", fontSize:11, color:"rgba(15,10,30,0.35)", fontWeight:600 }}>
              {uuids.length} UUID{uuids.length!==1?"s":""} · v4 · RFC 4122
            </div>
          </div>
        ) : (
          <div style={{ background:"#fffbeb", border:"1px dashed rgba(217,119,6,0.22)", borderRadius:14, minHeight:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"rgba(15,10,30,0.3)", fontSize:15, fontWeight:600 }}>
            <span style={{ fontSize:40 }}>ID</span>
            Click "Generate UUIDs" to get started
          </div>
        )}

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#d97706", textDecoration:"none" }}>← Back to DevForge</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(217,119,6,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 DevForge · UUID Generator</p>
      </footer>
    </div>
  );
}
