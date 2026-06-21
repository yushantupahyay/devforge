"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

function buildHighlighted(text: string, re: RegExp): { html: string; count: number } {
  const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  let result = "", lastIdx = 0, count = 0;
  const src = new RegExp(re.source, re.flags.includes("g") ? re.flags : "g" + re.flags);
  for (const m of Array.from(text.matchAll(src))) {
    result += esc(text.slice(lastIdx, m.index!));
    result += `<mark style="background:rgba(124,58,237,0.18);color:#6d28d9;border-radius:3px;padding:0 2px;font-weight:700">${esc(m[0])}</mark>`;
    lastIdx = m.index! + (m[0].length || 1);
    count++;
  }
  result += esc(text.slice(lastIdx));
  return { html: result, count };
}

export default function RegexTester() {
  const [pattern, setPattern] = useState("[a-zA-Z]+");
  const [flagG, setFlagG] = useState(true);
  const [flagI, setFlagI] = useState(false);
  const [flagM, setFlagM] = useState(false);
  const [testStr, setTestStr] = useState("Hello World! iNeedTools is a powerful platform for developers.\nBuild faster, code smarter with 9 developer tools.");

  const result = useMemo(() => {
    if (!pattern) return { html: testStr.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"), count: 0, groups: [] as string[], error: "" };
    try {
      const flags = (flagG?"g":"") + (flagI?"i":"") + (flagM?"m":"");
      const re = new RegExp(pattern, flags || "g");
      const { html, count } = buildHighlighted(testStr, re);
      const groups: string[] = [];
      const gRe = new RegExp(pattern, "g" + (flagI?"i":"") + (flagM?"m":""));
      for (const m of Array.from(testStr.matchAll(gRe))) {
        if (m.slice(1).some(Boolean)) groups.push(...m.slice(1).filter(Boolean));
      }
      return { html, count, groups, error: "" };
    } catch (e) {
      return { html: testStr.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"), count: 0, groups: [], error: String(e) };
    }
  }, [pattern, flagG, flagI, flagM, testStr]);

  const flags = (flagG?"g":"") + (flagI?"i":"") + (flagM?"m":"");

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#f0f9ff,#f5f3ff 50%,#fff)", padding:"40px 24px 32px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <p className="section-label mb-2">Pattern Tool</p>
          <div className="section-line" style={{ margin:"0 0 12px" }} />
          <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(28px,4vw,46px)", color:"#0f0a1e" }}>
            Regex <span className="text-gradient-cyan">Tester</span>
          </h1>
          <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15 }}>Live match highlighting with group extraction and match count.</p>
        </div>
      </section>

      <div style={{ maxWidth:1100, margin:"24px auto 48px", padding:"0 24px", width:"100%" }}>
        {/* pattern input */}
        <div className="glass" style={{ borderRadius:16, padding:"20px 24px", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <span style={{ fontFamily:"monospace", fontSize:18, color:"rgba(15,10,30,0.35)", fontWeight:700 }}>/</span>
            <input
              className="field field-mono"
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="pattern"
              style={{ flex:1, minWidth:180, borderRadius:10, fontSize:15 }}
            />
            <span style={{ fontFamily:"monospace", fontSize:18, color:"rgba(15,10,30,0.35)", fontWeight:700 }}>/</span>
            <div style={{ display:"flex", gap:8 }}>
              {([["g","Global",flagG,setFlagG],["i","Case insensitive",flagI,setFlagI],["m","Multiline",flagM,setFlagM]] as [string,string,boolean,(v:boolean)=>void][]).map(([k,tip,val,set]) => (
                <label key={k} title={tip} style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer", fontSize:14, fontWeight:700, color:val?"#7c3aed":"rgba(15,10,30,0.4)", userSelect:"none" }}>
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} style={{ accentColor:"#7c3aed" }} /> {k}
                </label>
              ))}
            </div>
            {/* status */}
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 14px", borderRadius:10, background:result.error?"rgba(225,29,72,0.07)":result.count>0?"rgba(5,150,105,0.07)":"rgba(0,0,0,0.04)", border:`1px solid ${result.error?"rgba(225,29,72,0.2)":result.count>0?"rgba(5,150,105,0.2)":"rgba(0,0,0,0.08)"}`, fontSize:12, fontWeight:700, color:result.error?"#e11d48":result.count>0?"#059669":"rgba(15,10,30,0.4)", whiteSpace:"nowrap" }}>
              {result.error ? "Invalid" : `${result.count} match${result.count!==1?"es":""}`}
            </div>
          </div>
          {pattern && !result.error && (
            <div style={{ marginTop:10, fontSize:12, color:"rgba(15,10,30,0.4)", fontFamily:"monospace" }}>
              Compiled: <span style={{ color:"#7c3aed" }}>/{pattern}/{flags}</span>
            </div>
          )}
          {result.error && <div style={{ marginTop:10, fontSize:12, color:"#e11d48", fontFamily:"monospace" }}>{result.error}</div>}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {/* test string */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Test String</label>
            <textarea className="field field-mono" value={testStr} onChange={e => setTestStr(e.target.value)} style={{ minHeight:320, borderRadius:12, fontSize:13 }} />
          </div>

          {/* highlighted output */}
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase" }}>Match Highlight</label>
              {result.count > 0 && <span className="badge badge-purple">{result.count} match{result.count!==1?"es":""}</span>}
            </div>
            <div
              style={{ background:"#f8f7ff", border:"1px solid rgba(124,58,237,0.14)", borderRadius:12, padding:"14px 16px", minHeight:320, fontFamily:"monospace", fontSize:13, lineHeight:1.85, whiteSpace:"pre-wrap", wordBreak:"break-word", color:"#0f0a1e" }}
              dangerouslySetInnerHTML={{ __html: result.html || '<span style="color:rgba(15,10,30,0.3)">Matches will highlight here</span>' }}
            />
          </div>
        </div>

        {/* groups */}
        {result.groups.length > 0 && (
          <div style={{ marginTop:14, padding:"14px 18px", background:"rgba(124,58,237,0.05)", border:"1px solid rgba(124,58,237,0.14)", borderRadius:12 }}>
            <p style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>Capture Groups</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {result.groups.map((g,i) => (
                <span key={i} style={{ padding:"3px 10px", borderRadius:6, background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.2)", fontFamily:"monospace", fontSize:12, color:"#6d28d9", fontWeight:600 }}>{g}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#0891b2", textDecoration:"none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(8,145,178,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · Regex Tester</p>
      </footer>
    </div>
  );
}
