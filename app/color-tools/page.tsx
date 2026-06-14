"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

function hexToRgb(hex: string): [number,number,number] | null {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : null;
}
function rgbToHsl(r: number, g: number, b: number): [number,number,number] {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h=0, s=0; const l=(max+min)/2;
  if (max!==min) {
    const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){ case r: h=((g-b)/d+(g<b?6:0))/6; break; case g: h=((b-r)/d+2)/6; break; default: h=((r-g)/d+4)/6; }
  }
  return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
}
function hslToHex(h: number, s: number, l: number): string {
  s/=100; l/=100;
  const k=(n: number)=>(n+h/30)%12;
  const a=s*Math.min(l,1-l);
  const f=(n: number)=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
  const t=(x: number)=>Math.round(x*255).toString(16).padStart(2,"0");
  return "#"+t(f(0))+t(f(8))+t(f(4));
}

export default function ColorTools() {
  const [hex, setHex] = useState("#7c3aed");
  const [copied, setCopied] = useState<string|null>(null);

  const clean = hex.startsWith("#") ? hex : "#" + hex;
  const rgb   = hexToRgb(clean);
  const hsl   = rgb ? rgbToHsl(...rgb) : null;
  const valid = !!rgb;

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /**/ }
    setCopied(id); setTimeout(() => setCopied(null), 1500);
  };

  const palette = hsl ? [
    { label:"Complement",  hex: hslToHex((hsl[0]+180)%360, hsl[1], hsl[2]) },
    { label:"Analogous 1", hex: hslToHex((hsl[0]+30)%360,  hsl[1], hsl[2]) },
    { label:"Analogous 2", hex: hslToHex((hsl[0]-30+360)%360, hsl[1], hsl[2]) },
    { label:"Triadic 1",   hex: hslToHex((hsl[0]+120)%360, hsl[1], hsl[2]) },
    { label:"Triadic 2",   hex: hslToHex((hsl[0]+240)%360, hsl[1], hsl[2]) },
    { label:"Lighter",     hex: hslToHex(hsl[0], hsl[1], Math.min(95, hsl[2]+20)) },
    { label:"Darker",      hex: hslToHex(hsl[0], hsl[1], Math.max(5,  hsl[2]-20)) },
    { label:"Desaturated", hex: hslToHex(hsl[0], Math.max(0, hsl[1]-30), hsl[2]) },
  ] : [];

  const CopyBtn = ({ text, id }: { text:string; id:string }) => (
    <button onClick={() => copy(text, id)} style={{ padding:"2px 8px", borderRadius:5, border:"1px solid rgba(0,0,0,0.1)", background:"rgba(0,0,0,0.04)", fontSize:11, fontWeight:700, cursor:"pointer", color:copied===id?"#059669":"rgba(15,10,30,0.55)" }}>
      {copied===id?"✓":"Copy"}
    </button>
  );

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#fff1f2,#fce7f3 30%,#fff)", padding:"40px 24px 32px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <p className="section-label mb-2" style={{ color:"#e11d48" }}>Design Tool</p>
          <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#e11d48,#db2777)" }} />
          <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(28px,4vw,46px)", color:"#0f0a1e" }}>
            Color <span style={{ background:"linear-gradient(135deg,#e11d48,#be123c)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Tools</span>
          </h1>
          <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15 }}>Pick a color, convert between HEX / RGB / HSL, and generate a palette instantly.</p>
        </div>
      </section>

      <div style={{ maxWidth:900, margin:"24px auto 48px", padding:"0 24px", width:"100%" }}>

        {/* picker + conversions */}
        <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:16, marginBottom:20, alignItems:"start" }}>
          {/* color picker */}
          <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
            <div style={{ width:130, height:130, borderRadius:16, background: valid ? clean : "#e5e7eb", boxShadow:"0 8px 32px rgba(0,0,0,0.18)", border:"3px solid rgba(255,255,255,0.8)" }} />
            <input type="color" value={valid ? clean : "#7c3aed"} onChange={e => setHex(e.target.value)}
              style={{ width:50, height:36, borderRadius:8, border:"none", cursor:"pointer", padding:2 }} />
          </div>

          {/* conversions */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {/* hex input */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:4 }}>HEX</label>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input className="field field-mono" value={hex} onChange={e => setHex(e.target.value)} placeholder="#7c3aed" style={{ borderRadius:10, fontSize:15, fontWeight:700 }} />
                {valid && <CopyBtn text={clean.toUpperCase()} id="hex" />}
              </div>
              {!valid && hex && <div style={{ marginTop:4, fontSize:12, color:"#e11d48" }}>Invalid hex color</div>}
            </div>

            {/* rgb */}
            {rgb && (
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:4 }}>RGB</label>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div className="field field-mono" style={{ borderRadius:10, fontSize:14, fontWeight:600, color:"#0f0a1e", display:"flex", alignItems:"center" }}>
                    rgb({rgb[0]}, {rgb[1]}, {rgb[2]})
                  </div>
                  <CopyBtn text={`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`} id="rgb" />
                </div>
              </div>
            )}

            {/* hsl */}
            {hsl && (
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:4 }}>HSL</label>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div className="field field-mono" style={{ borderRadius:10, fontSize:14, fontWeight:600, color:"#0f0a1e", display:"flex", alignItems:"center" }}>
                    hsl({hsl[0]}°, {hsl[1]}%, {hsl[2]}%)
                  </div>
                  <CopyBtn text={`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`} id="hsl" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* palette */}
        {palette.length > 0 && (
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:10 }}>Generated Palette</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:10 }}>
              {palette.map(p => (
                <button key={p.label} onClick={() => { setHex(p.hex); copy(p.hex, p.label); }} style={{ background:"none", border:"none", cursor:"pointer", textAlign:"center", padding:0 }}>
                  <div style={{ height:64, borderRadius:10, background:p.hex, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", border:"2px solid rgba(255,255,255,0.7)", marginBottom:6, transition:"transform 0.15s" }} />
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(15,10,30,0.45)", textTransform:"uppercase", letterSpacing:"0.05em" }}>{p.label}</div>
                  <div style={{ fontFamily:"monospace", fontSize:11, color:"rgba(15,10,30,0.6)", marginTop:2 }}>{p.hex}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#e11d48", textDecoration:"none" }}>← Back to DevForge</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(225,29,72,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 DevForge · Color Tools</p>
      </footer>
    </div>
  );
}
