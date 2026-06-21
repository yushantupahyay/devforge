"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

function toTitleCase(s: string) { return s.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()); }
function toCamel(s: string)     { return s.replace(/[-_ ]+(.)/g, (_,c) => c.toUpperCase()).replace(/^./, c => c.toLowerCase()); }
function toSnake(s: string)     { return s.replace(/\s+/g,"_").replace(/([a-z])([A-Z])/g,"$1_$2").replace(/-/g,"_").toLowerCase(); }
function toKebab(s: string)     { return s.replace(/\s+/g,"-").replace(/([a-z])([A-Z])/g,"$1-$2").replace(/_/g,"-").toLowerCase(); }

export default function TextTools() {
  const [input, setInput]   = useState("The quick brown fox jumps over the lazy dog.\niNeedTools helps developers build faster.\nSame line repeated.\nSame line repeated.");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const trimmed = input.trim();
    const words   = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
    const lines   = input.split("\n");
    const unique  = new Set(words.map(w => w.toLowerCase()));
    return { chars: input.length, words: words.length, lines: lines.length, unique: unique.size, sentences: (input.match(/[.!?]+/g)||[]).length };
  }, [input]);

  const copy = async () => {
    const text = output || input;
    try { await navigator.clipboard.writeText(text); } catch { /**/ }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const apply = (fn: (s: string) => string) => setOutput(fn(input));

  const CASE_BTNS = [
    { label:"UPPERCASE",  fn: (s:string) => s.toUpperCase(),  color:"#7c3aed" },
    { label:"lowercase",  fn: (s:string) => s.toLowerCase(),  color:"#0891b2" },
    { label:"Title Case", fn: toTitleCase,                    color:"#d97706" },
    { label:"camelCase",  fn: toCamel,                        color:"#059669" },
    { label:"snake_case", fn: toSnake,                        color:"#db2777" },
    { label:"kebab-case", fn: toKebab,                        color:"#e11d48" },
  ];

  const TEXT_BTNS = [
    { label:"Sort Lines A→Z",    fn: (s:string) => s.split("\n").sort((a,b)=>a.localeCompare(b)).join("\n") },
    { label:"Sort Lines Z→A",    fn: (s:string) => s.split("\n").sort((a,b)=>b.localeCompare(a)).join("\n") },
    { label:"Remove Duplicates", fn: (s:string) => [...new Set(s.split("\n"))].join("\n") },
    { label:"Reverse Lines",     fn: (s:string) => s.split("\n").reverse().join("\n") },
    { label:"Trim Each Line",    fn: (s:string) => s.split("\n").map(l=>l.trim()).join("\n") },
    { label:"Remove Blank Lines",fn: (s:string) => s.split("\n").filter(l=>l.trim()).join("\n") },
    { label:"Reverse Text",      fn: (s:string) => s.split("").reverse().join("") },
    { label:"Shuffle Lines",     fn: (s:string) => { const a=s.split("\n"); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*i+1);[a[i],a[j]]=[a[j],a[i]];} return a.join("\n"); } },
  ];

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#faf5ff,#f3e8ff 30%,#fff)", padding:"40px 24px 32px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <p className="section-label mb-2">Text Tool</p>
          <div className="section-line" style={{ margin:"0 0 12px" }} />
          <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(28px,4vw,46px)", color:"#0f0a1e" }}>
            Text <span className="text-gradient-purple">Tools</span>
          </h1>
          <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15 }}>Word count, case conversion, sorting, deduplication and more — all offline.</p>
        </div>
      </section>

      <div style={{ maxWidth:1100, margin:"24px auto 48px", padding:"0 24px", width:"100%" }}>
        {/* stats */}
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          {[["Words",stats.words],["Characters",stats.chars],["Lines",stats.lines],["Unique Words",stats.unique],["Sentences",stats.sentences]].map(([k,v]) => (
            <div key={k as string} style={{ padding:"8px 14px", borderRadius:10, background:"rgba(124,58,237,0.06)", border:"1px solid rgba(124,58,237,0.13)" }}>
              <span style={{ fontWeight:900, fontSize:18, color:"#7c3aed" }}>{v}</span>
              <span style={{ fontSize:11, fontWeight:600, color:"rgba(15,10,30,0.4)", marginLeft:6 }}>{k}</span>
            </div>
          ))}
        </div>

        {/* case buttons */}
        <div style={{ marginBottom:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>Case Conversion</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {CASE_BTNS.map(b => (
              <button key={b.label} onClick={() => apply(b.fn)} style={{ padding:"7px 16px", borderRadius:9, border:`1px solid ${b.color}30`, background:`${b.color}0c`, color:b.color, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"monospace" }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* text transform buttons */}
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>Text Operations</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {TEXT_BTNS.map(b => (
              <button key={b.label} onClick={() => apply(b.fn)} style={{ padding:"7px 14px", borderRadius:9, border:"1px solid rgba(124,58,237,0.2)", background:"rgba(124,58,237,0.06)", color:"#6d28d9", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* editors */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase" }}>Input Text</label>
              <button onClick={() => setInput("")} style={{ fontSize:11, fontWeight:600, color:"#e11d48", background:"rgba(225,29,72,0.06)", border:"1px solid rgba(225,29,72,0.15)", borderRadius:6, padding:"3px 9px", cursor:"pointer" }}>Clear</button>
            </div>
            <textarea className="field field-mono" value={input} onChange={e => { setInput(e.target.value); setOutput(""); }} style={{ minHeight:320, borderRadius:12, fontSize:13 }} />
          </div>

          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase" }}>Output</label>
              <div style={{ display:"flex", gap:8 }}>
                {output && <button onClick={() => setInput(output)} style={{ fontSize:11, fontWeight:600, color:"#0891b2", background:"rgba(8,145,178,0.07)", border:"1px solid rgba(8,145,178,0.18)", borderRadius:6, padding:"3px 9px", cursor:"pointer" }}>Use as Input</button>}
                <button onClick={copy} style={{ fontSize:11, fontWeight:600, color:copied?"#059669":"#7c3aed", background:copied?"rgba(5,150,105,0.07)":"rgba(124,58,237,0.07)", border:`1px solid ${copied?"rgba(5,150,105,0.2)":"rgba(124,58,237,0.15)"}`, borderRadius:6, padding:"3px 9px", cursor:"pointer" }}>
                  {copied?"✓ Copied!":"Copy"}
                </button>
              </div>
            </div>
            {output ? (
              <textarea className="field field-mono" value={output} readOnly style={{ minHeight:320, borderRadius:12, fontSize:13, background:"#f8f7ff" }} />
            ) : (
              <div style={{ background:"#f8f7ff", border:"1px dashed rgba(124,58,237,0.18)", borderRadius:12, minHeight:320, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(15,10,30,0.3)", fontSize:14, fontWeight:600 }}>
                Apply a transformation to see output
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#7c3aed", textDecoration:"none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(124,58,237,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · Text Tools</p>
      </footer>
    </div>
  );
}
