"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

type Mode = "upload" | "text";

const SAMPLE_TEXT = `Dear Hiring Manager,

I am writing to express my interest in the **Software Engineer** position at your company.

## About Me

With over five years of experience building scalable web applications and a strong background in TypeScript, React, and Node.js, I am confident I would be a valuable addition to your team.

## Key Achievements

In my current role at TechCorp, I led the migration of a monolithic application to microservices, reducing deployment time by 60% and improving system reliability.

Thank you for considering my application.

Sincerely,
Alex Johnson`;

async function docxToHtml(file: File): Promise<{ html: string; messages: string[] }> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return {
    html: result.value,
    messages: result.messages.map((m: { message: string }) => m.message),
  };
}

/* ── Direct PDF download — DOM-break + canvas-slice approach ── */

const MARGIN_MM    = 20;
const CONTENT_W_MM = 210 - MARGIN_MM * 2;                  // 170mm
const CONTENT_W_PX = Math.round(CONTENT_W_MM * 96 / 25.4); // 643px at 96 DPI
const PAGE_H_MM    = 297 - MARGIN_MM * 2;                  // 257mm
const PAGE_H_PX    = Math.round(PAGE_H_MM * 96 / 25.4);    // 973px at 96 DPI

const DOC_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body, div { font-family: "Times New Roman", Times, serif; font-size: 13.5px; line-height: 1.75; color: #000; }
  h1 { font-size: 22px; font-weight: bold; margin: 16px 0 8px; }
  h2 { font-size: 18px; font-weight: bold; margin: 12px 0 6px; }
  h3 { font-size: 14px; font-weight: bold; margin: 10px 0 4px; }
  p  { margin: 0 0 9px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  td, th { border: 1px solid #888; padding: 4px 8px; font-size: 12px; }
  ul, ol { padding-left: 20px; margin: 5px 0; }
  li { margin-bottom: 2px; }
  strong { font-weight: bold; }
  em { font-style: italic; }
  img { max-width: 100%; }
  a { color: #1a5276; }
`;

/* Find page break Y positions by looking at element boundaries in the DOM */
function getPageBreaks(wrap: HTMLElement): number[] {
  const totalH = wrap.scrollHeight;
  const ctop   = wrap.getBoundingClientRect().top;

  /* All block-level elements, sorted top-to-bottom */
  const els = (Array.from(
    wrap.querySelectorAll("p,h1,h2,h3,h4,h5,h6,li,tr,img,blockquote,pre,td,th")
  ) as HTMLElement[]).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

  const breaks = [0];
  let start = 0;

  while (start + PAGE_H_PX < totalH) {
    const end = start + PAGE_H_PX;
    let cut   = end; // default: cut at hard page boundary

    /* Find the element that would be cut — break just before it */
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const t = r.top    - ctop;
      const b = r.bottom - ctop;
      if (t < end - 4 && b > end + 4 && t > start + 10) {
        cut = t;
        break;
      }
    }

    if (cut <= start) cut = end; // safety: always advance
    breaks.push(Math.round(cut));
    start = Math.round(cut);
  }

  breaks.push(totalH);
  return breaks;
}

async function downloadAsPdf(
  contentHtml: string,
  fileName: string,
  setConverting: (v: boolean) => void,
) {
  setConverting(true);
  try {
    const h2c   = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    /* Off-screen container — exact content-area width, no padding (margins applied in PDF) */
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      position:   "fixed",
      left:       "-99999px",
      top:        "0",
      width:      `${CONTENT_W_PX}px`,
      background: "#ffffff",
    });
    wrap.innerHTML = `<style>${DOC_STYLES}</style>${contentHtml}`;
    document.body.appendChild(wrap);
    void wrap.offsetHeight; // force layout before measuring

    /* 1. Detect smart page breaks from DOM positions */
    const breaks = getPageBreaks(wrap);

    /* 2. Render entire content to ONE canvas (scale=1 for speed + canvas size limits) */
    const canvas = await h2c(wrap, {
      scale:           1,
      useCORS:         true,
      backgroundColor: "#ffffff",
      logging:         false,
      width:           CONTENT_W_PX,
    });
    document.body.removeChild(wrap);

    /* 3. Slice canvas at break points and embed each slice as a PDF page */
    const pdf      = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const mmPerPx  = CONTENT_W_MM / canvas.width; // mm per canvas pixel

    for (let i = 0; i < breaks.length - 1; i++) {
      if (i > 0) pdf.addPage();

      const y0     = breaks[i];
      const y1     = breaks[i + 1];
      const sliceH = y1 - y0;
      const sliceH_mm = sliceH * mmPerPx;

      /* Copy the slice into a temporary canvas */
      const pc  = document.createElement("canvas");
      pc.width  = canvas.width;
      pc.height = sliceH;
      const ctx = pc.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pc.width, pc.height);
      ctx.drawImage(canvas, 0, y0, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      pdf.addImage(
        pc.toDataURL("image/jpeg", 0.93),
        "JPEG",
        MARGIN_MM, MARGIN_MM,
        CONTENT_W_MM, sliceH_mm,
      );
    }

    pdf.save((fileName || "document") + ".pdf");
  } finally {
    setConverting(false);
  }
}

export default function WordToPdf() {
  const [mode,       setMode]       = useState<Mode>("upload");
  const [html,       setHtml]       = useState("");
  const [textInput,  setTextInput]  = useState(SAMPLE_TEXT);
  const [fileName,   setFileName]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [converting, setConverting] = useState(false);
  const [error,      setError]      = useState("");
  const [warnings,   setWarnings]   = useState<string[]>([]);
  const [wordCount,  setWordCount]  = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Please upload a .docx file (Microsoft Word format)."); return;
    }
    setLoading(true); setError(""); setHtml(""); setWarnings([]);
    setFileName(file.name);
    try {
      const { html: converted, messages } = await docxToHtml(file);
      setHtml(converted);
      setWarnings(messages.filter(Boolean));
      const text = converted.replace(/<[^>]+>/g, " ").trim();
      setWordCount(text ? text.split(/\s+/).length : 0);
    } catch (e) {
      setError(String(e).replace("Error: ", ""));
    } finally { setLoading(false); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  /* Text-mode markdown → HTML */
  const textToHtml = (src: string) =>
    src
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
      .replace(/\*(.+?)\*/g,"<em>$1</em>")
      .replace(/^## (.+)$/gm,"<h2>$1</h2>")
      .replace(/^# (.+)$/gm,"<h1>$1</h1>")
      .split("\n\n")
      .map((b: string) => b.startsWith("<h") ? b : `<p>${b.replace(/\n/g,"<br/>")}</p>`)
      .join("");

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#f0f9ff,#e0f2fe 30%,#fff)", padding:"36px 40px 28px" }}>
        <p className="section-label mb-2" style={{ color:"#0284c7" }}>Document Tool</p>
        <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#0284c7,#0369a1)" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(26px,3.5vw,48px)", color:"#0f0a1e" }}>
          Word <span style={{ background:"linear-gradient(135deg,#0284c7,#0369a1)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>→ PDF</span>
        </h1>
        <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15, maxWidth:600 }}>
          Upload a <strong>Word</strong> file and download a PDF directly — headings, tables, bold, italic and lists preserved. 100% in your browser.
        </p>
      </section>

      <div style={{ width:"100%", padding:"18px 40px 48px", flex:1, boxSizing:"border-box" }}>

        {/* mode tabs */}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {([["upload","📂 Upload Word","#0284c7"],["text","✏️ Type Text","#7c3aed"]] as [Mode,string,string][]).map(([key,label,color]) => (
            <button key={key} onClick={() => setMode(key as Mode)} style={{ padding:"9px 22px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", background:mode===key?color:"rgba(0,0,0,0.04)", color:mode===key?"#fff":"rgba(15,10,30,0.55)", border:mode===key?`1px solid ${color}`:"1px solid rgba(0,0,0,0.09)", boxShadow:mode===key?`0 4px 14px ${color}33`:"none" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── UPLOAD MODE ─────────────────────────────────── */}
        {mode === "upload" && (
          <div style={{ display:"grid", gridTemplateColumns: html ? "1fr 1fr" : "1fr", gap:20 }}>

            {/* left: drop zone + controls */}
            <div>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{ border:"2px dashed rgba(2,132,199,0.35)", borderRadius:18, padding:"52px 32px", textAlign:"center", cursor:"pointer", background:"rgba(2,132,199,0.03)", transition:"border-color 0.2s", marginBottom:14 }}
              >
                <input ref={fileRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display:"none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <div style={{ fontSize:52, marginBottom:14 }}>📄</div>
                <p style={{ fontSize:16, fontWeight:700, color:"#0f0a1e", marginBottom:4 }}>Drop your Word file here</p>
                <p style={{ fontSize:13, color:"rgba(15,10,30,0.45)", marginBottom:16 }}>or click to browse · accepts .docx</p>
                <span style={{ padding:"8px 20px", borderRadius:9, background:"linear-gradient(135deg,#0284c7,#0369a1)", color:"#fff", fontSize:13, fontWeight:700 }}>Choose File</span>
                {fileName && <p style={{ marginTop:14, fontSize:12, fontWeight:700, color:"#0284c7", fontFamily:"monospace" }}>📎 {fileName}</p>}
              </div>

              {loading && (
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px", borderRadius:12, background:"rgba(2,132,199,0.05)", border:"1px solid rgba(2,132,199,0.15)", marginBottom:12 }}>
                  <span style={{ width:16, height:16, borderRadius:"50%", border:"2px solid #0284c7", borderTopColor:"transparent", display:"inline-block", animation:"spin 0.7s linear infinite" }} />
                  <span style={{ fontSize:13, fontWeight:600, color:"#0284c7" }}>Reading Word file…</span>
                </div>
              )}

              {error && (
                <div style={{ padding:"12px 16px", borderRadius:12, background:"rgba(225,29,72,0.05)", border:"1px solid rgba(225,29,72,0.18)", fontSize:13, color:"#e11d48", marginBottom:12 }}>
                  ✕ {error}
                </div>
              )}

              {warnings.length > 0 && (
                <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(217,119,6,0.05)", border:"1px solid rgba(217,119,6,0.2)", fontSize:11, color:"#b45309", marginBottom:12 }}>
                  <strong>Conversion notes:</strong> {warnings.slice(0,3).join("; ")}
                </div>
              )}

              {html && (
                <>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:7, background:"rgba(5,150,105,0.07)", border:"1px solid rgba(5,150,105,0.14)", color:"#059669" }}>✓ Ready</span>
                    <span style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:7, background:"rgba(2,132,199,0.07)", border:"1px solid rgba(2,132,199,0.14)", color:"#0284c7" }}>{wordCount.toLocaleString()} words</span>
                  </div>
                  <button
                    onClick={() => downloadAsPdf(html, fileName.replace(/\.docx$/i,""), setConverting)}
                    disabled={converting}
                    style={{ width:"100%", padding:"13px 24px", borderRadius:12, fontSize:15, fontWeight:700, cursor:converting?"wait":"pointer", background:"linear-gradient(135deg,#0284c7,#0369a1)", color:"#fff", border:"none", boxShadow:"0 4px 20px rgba(2,132,199,0.35)", opacity:converting?0.75:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
                  >
                    {converting
                      ? <><span style={{ width:14, height:14, borderRadius:"50%", border:"2px solid #fff", borderTopColor:"transparent", display:"inline-block", animation:"spin 0.7s linear infinite" }} /> Generating PDF…</>
                      : "⬇ Download PDF"}
                  </button>
                </>
              )}

              <div style={{ marginTop:14, padding:"14px 18px", borderRadius:12, background:"rgba(2,132,199,0.04)", border:"1px solid rgba(2,132,199,0.1)", fontSize:12, color:"rgba(15,10,30,0.5)", lineHeight:1.8 }}>
                <strong style={{ color:"#0284c7" }}>Supported:</strong> .docx (Word 2007+) &nbsp;·&nbsp; Headings, bold, italic, tables, lists &nbsp;·&nbsp; 100% browser-based
              </div>
            </div>

            {/* right: HTML preview */}
            {html && (
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Document Preview</label>
                <div
                  style={{ border:"1px solid rgba(2,132,199,0.18)", borderRadius:14, padding:"28px 32px", background:"#fff", minHeight:500, maxHeight:700, overflowY:"auto", fontSize:14, lineHeight:1.8, color:"#0f0a1e", fontFamily:'"Times New Roman", Times, serif', boxShadow:"0 4px 24px rgba(0,0,0,0.06)" }}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── TEXT MODE ─────────────────────────────────────── */}
        {mode === "text" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Type / Paste Text</label>
              <p style={{ fontSize:12, color:"rgba(15,10,30,0.4)", marginBottom:8 }}>
                Supports: <code style={{ background:"rgba(0,0,0,0.05)", padding:"1px 5px", borderRadius:3, fontSize:11 }}>**bold**</code> &nbsp;
                <code style={{ background:"rgba(0,0,0,0.05)", padding:"1px 5px", borderRadius:3, fontSize:11 }}>*italic*</code> &nbsp;
                <code style={{ background:"rgba(0,0,0,0.05)", padding:"1px 5px", borderRadius:3, fontSize:11 }}># Heading</code>
              </p>
              <textarea
                className="field field-mono"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Type your document here…"
                style={{ minHeight:460, borderRadius:14, fontSize:13, lineHeight:1.7, resize:"vertical", width:"100%" }}
              />
              <button
                onClick={() => downloadAsPdf(textToHtml(textInput), "document", setConverting)}
                disabled={converting}
                style={{ marginTop:12, width:"100%", padding:"13px 24px", borderRadius:12, fontSize:14, fontWeight:700, cursor:converting?"wait":"pointer", background:"linear-gradient(135deg,#7c3aed,#6d28d9)", color:"#fff", border:"none", boxShadow:"0 4px 20px rgba(124,58,237,0.3)", opacity:converting?0.75:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
              >
                {converting
                  ? <><span style={{ width:14, height:14, borderRadius:"50%", border:"2px solid #fff", borderTopColor:"transparent", display:"inline-block", animation:"spin 0.7s linear infinite" }} /> Generating PDF…</>
                  : "⬇ Download PDF"}
              </button>
            </div>

            {/* live preview */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Preview</label>
              <div style={{ border:"1px solid rgba(124,58,237,0.18)", borderRadius:14, padding:"28px 32px", background:"#fff", minHeight:460, fontSize:14, lineHeight:1.8, color:"#0f0a1e", fontFamily:"Georgia, serif", boxShadow:"0 4px 24px rgba(0,0,0,0.06)" }}>
                {textInput.trim() ? (
                  <div dangerouslySetInnerHTML={{ __html: textToHtml(textInput) }} />
                ) : (
                  <span style={{ color:"rgba(15,10,30,0.25)", fontStyle:"italic" }}>Start typing to see preview…</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#0284c7", textDecoration:"none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(2,132,199,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · Word → PDF</p>
      </footer>
    </div>
  );
}
