"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

const DEFAULT_HTML = `<div class="card">
  <h1>Hello, iNeedTools! 👋</h1>
  <p>Edit the <strong>HTML</strong>, <strong>CSS</strong> and <strong>JS</strong> tabs on the left and see the live preview update instantly.</p>
  <button onclick="greet()">Click Me</button>
  <p id="output"></p>
</div>`;

const DEFAULT_CSS = `* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%);
}

.card {
  background: white;
  border-radius: 20px;
  padding: 48px 40px;
  box-shadow: 0 12px 40px rgba(124, 58, 237, 0.14);
  text-align: center;
  max-width: 480px;
  width: 90%;
}

h1 {
  font-size: 26px;
  font-weight: 900;
  color: #7c3aed;
  margin-bottom: 14px;
}

p {
  color: rgba(15, 10, 30, 0.55);
  font-size: 15px;
  line-height: 1.7;
}

button {
  margin-top: 22px;
  padding: 12px 28px;
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
}

#output {
  margin-top: 14px;
  min-height: 22px;
  font-weight: 700;
  color: #7c3aed;
  font-size: 15px;
}`;

const DEFAULT_JS = `function greet() {
  const el = document.getElementById('output');
  const msgs = [
    'Hello from iNeedTools! 🚀',
    'JavaScript is running! ✅',
    'Build something amazing! 💡',
    'Code. Test. Ship. 🎯',
    'You are awesome! ⭐',
  ];
  el.textContent = msgs[Math.floor(Math.random() * msgs.length)];
}`;

type Lang = "html" | "css" | "js";

const TABS: { key: Lang; label: string; color: string }[] = [
  { key: "html", label: "HTML", color: "#e11d48" },
  { key: "css",  label: "CSS",  color: "#0891b2" },
  { key: "js",   label: "JS",   color: "#d97706" },
];

export default function HtmlCompiler() {
  const [html, setHtml]     = useState(DEFAULT_HTML);
  const [css,  setCss]      = useState(DEFAULT_CSS);
  const [js,   setJs]       = useState(DEFAULT_JS);
  const [active, setActive] = useState<Lang>("html");
  const [splitPct, setSplitPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const box = containerRef.current?.getBoundingClientRect();
      if (!box) return;
      const pct = ((e.clientX - box.left) / box.width) * 100;
      setSplitPct(Math.min(78, Math.max(22, pct)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const vals: Record<Lang, string>            = { html, css, js };
  const setters: Record<Lang, (v:string) => void> = { html:setHtml, css:setCss, js:setJs };

  const srcDoc = useMemo(() => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>${css}</style>
</head>
<body>
${html}
<script>
(function(){
  try { ${js} }
  catch(e){
    var d=document.createElement('div');
    d.style.cssText='position:fixed;bottom:0;left:0;right:0;padding:8px 16px;background:#fee2e2;color:#b91c1c;font:600 12px/1.6 monospace;border-top:2px solid #fca5a5;z-index:9999';
    d.textContent='⚠ JS Error: '+e.message;
    document.body.appendChild(d);
  }
})();
<\/script>
</body>
</html>`, [html, css, js]);

  const activeTab = TABS.find(t => t.key === active)!;

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      {/* hero */}
      <section style={{ background:"linear-gradient(135deg,#fdf2f8,#fce7f3 30%,#fff)", padding:"28px 40px 20px" }}>
        <p className="section-label mb-1" style={{ color:"#c026d3" }}>Code Tool</p>
        <div className="section-line" style={{ margin:"0 0 10px", background:"linear-gradient(90deg,#c026d3,#a21caf)" }} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 className="font-black tracking-tight" style={{ fontSize:"clamp(20px,2.5vw,36px)", color:"#0f0a1e", marginBottom:4 }}>
              HTML / CSS / JS{" "}
              <span style={{ background:"linear-gradient(135deg,#c026d3,#a21caf)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                Compiler
              </span>
            </h1>
            <p style={{ color:"rgba(15,10,30,0.5)", fontSize:13 }}>
              Write code on the left, see a live browser preview on the right. Drag the handle to resize panels.
            </p>
          </div>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#c026d3", textDecoration:"none", whiteSpace:"nowrap" }}>← Back to iNeedTools</Link>
        </div>
      </section>

      {/* ── main split area ─────────────────────────────── */}
      <div
        ref={containerRef}
        style={{ flex:1, display:"flex", flexDirection:"row", padding:"14px 40px 40px", gap:0, boxSizing:"border-box", userSelect: dragging ? "none" : undefined, minHeight:0 }}
      >
        {/* ── LEFT: code editor ──────────────────────────── */}
        <div style={{ width:`${splitPct}%`, display:"flex", flexDirection:"column", border:"1px solid rgba(0,0,0,0.1)", borderRadius:14, overflow:"hidden", minWidth:0 }}>

          {/* tab bar — light mode */}
          <div style={{ display:"flex", background:"#f8fafc", borderBottom:"1px solid rgba(0,0,0,0.08)" }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                style={{ padding:"10px 24px", fontSize:13, fontWeight:700, cursor:"pointer", background: active===t.key ? "#ffffff" : "transparent", color: active===t.key ? t.color : "rgba(15,10,30,0.4)", border:"none", borderBottom: active===t.key ? `2px solid ${t.color}` : "2px solid transparent", transition:"all 0.15s", letterSpacing:"0.04em" }}
              >
                {t.label}
              </button>
            ))}
            {/* stats */}
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12, paddingRight:14, fontSize:11, fontFamily:"monospace", color:"rgba(15,10,30,0.35)" }}>
              <span style={{ color: activeTab.color }}>{vals[active].split("\n").length}L · {vals[active].length}ch</span>
              <button
                onClick={() => { setHtml(DEFAULT_HTML); setCss(DEFAULT_CSS); setJs(DEFAULT_JS); }}
                style={{ padding:"3px 10px", borderRadius:6, border:"1px solid rgba(0,0,0,0.1)", background:"rgba(0,0,0,0.03)", color:"rgba(15,10,30,0.45)", fontSize:11, cursor:"pointer", fontWeight:600 }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* textarea — light mode */}
          <textarea
            key={active}
            value={vals[active]}
            onChange={e => setters[active](e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            style={{ flex:1, width:"100%", fontFamily:'"Fira Code","Cascadia Code","JetBrains Mono",Consolas,monospace', fontSize:13.5, lineHeight:1.8, padding:"16px 20px", background:"#ffffff", color:"#1e293b", border:"none", outline:"none", resize:"none", boxSizing:"border-box", tabSize:2, display:"block", minHeight:400 }}
          />

          {/* bottom status bar */}
          <div style={{ display:"flex", gap:10, padding:"5px 14px", background:"#f8fafc", borderTop:"1px solid rgba(0,0,0,0.07)", fontSize:11, fontFamily:"monospace", color:"rgba(15,10,30,0.35)" }}>
            {TABS.map(t => (
              <span key={t.key} style={{ color: active===t.key ? t.color : undefined }}>
                {t.label}: {vals[t.key].length}ch
              </span>
            ))}
            <span style={{ marginLeft:"auto" }}>Live preview updates as you type</span>
          </div>
        </div>

        {/* ── DRAG HANDLE ─────────────────────────────────── */}
        <div style={{ width:28, flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, cursor:"col-resize", userSelect:"none", zIndex:10, padding:"0 2px" }}>
          <button
            onClick={() => setSplitPct(p => Math.max(22, p - 5))}
            title="Expand editor"
            style={{ width:20, height:20, borderRadius:4, border:"1px solid rgba(192,38,211,0.25)", background:"rgba(192,38,211,0.06)", color:"#a21caf", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, padding:0 }}
          >◀</button>
          <div
            onMouseDown={() => setDragging(true)}
            style={{ width:6, flex:1, maxHeight:160, borderRadius:3, background: dragging ? "rgba(192,38,211,0.5)" : "rgba(192,38,211,0.15)", cursor:"col-resize", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, transition:"background 0.15s" }}
          >
            {[0,1,2,3,4].map(i => <div key={i} style={{ width:2, height:2, borderRadius:"50%", background: dragging ? "#c026d3" : "rgba(192,38,211,0.5)" }} />)}
          </div>
          <span style={{ fontSize:9, fontFamily:"monospace", color:"rgba(15,10,30,0.3)", fontWeight:600, transform:"rotate(-90deg)", whiteSpace:"nowrap", letterSpacing:"0.05em" }}>{Math.round(splitPct)}%</span>
          <button
            onClick={() => setSplitPct(p => Math.min(78, p + 5))}
            title="Expand preview"
            style={{ width:20, height:20, borderRadius:4, border:"1px solid rgba(192,38,211,0.25)", background:"rgba(192,38,211,0.06)", color:"#a21caf", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, padding:0 }}
          >▶</button>
        </div>

        {/* ── RIGHT: live preview ─────────────────────────── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", border:"1px solid rgba(0,0,0,0.1)", borderRadius:14, overflow:"hidden", minWidth:0 }}>
          {/* browser chrome */}
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", background:"#f8fafc", borderBottom:"1px solid rgba(0,0,0,0.08)", flexShrink:0 }}>
            <div style={{ display:"flex", gap:5 }}>
              {["#ff5f57","#ffbd2e","#28ca41"].map(c => <div key={c} style={{ width:10,height:10,borderRadius:"50%",background:c }} />)}
            </div>
            <div style={{ flex:1, background:"#fff", borderRadius:6, padding:"4px 12px", fontSize:11, color:"rgba(15,10,30,0.35)", fontFamily:"monospace", border:"1px solid rgba(0,0,0,0.08)" }}>
              preview://localhost
            </div>
            <span style={{ fontSize:11, fontWeight:600, color:"rgba(15,10,30,0.35)" }}>Preview</span>
          </div>

          <iframe
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            style={{ width:"100%", flex:1, border:"none", background:"#fff", display:"block", minHeight:400 }}
            title="Live Preview"
          />
        </div>
      </div>

      <footer className="mt-auto py-6 text-center" style={{ borderTop:"1px solid rgba(192,38,211,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · HTML / CSS / JS Compiler</p>
      </footer>
    </div>
  );
}
