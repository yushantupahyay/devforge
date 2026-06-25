"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

/* ── Types ──────────────────────────────────────────────────── */

interface PdfPage {
  imageBase64: string; // PNG of the rendered page (for Word embedding + preview)
  textLines: string[]; // plain text lines (for word count + copy)
  width: number;       // page width in PDF points
  height: number;      // page height in PDF points
}

/* ── PDF extraction + rendering ─────────────────────────────── */

let _pdfjsWorkerSet = false;

async function extractPdfPages(file: File): Promise<{ pages: PdfPage[]; pageCount: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = await import("pdfjs-dist") as any;
  if (!_pdfjsWorkerSet) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    _pdfjsWorkerSet = true;
  }

  const data = new Uint8Array(await file.arrayBuffer());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdf: any;
  try {
    pdf = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
  } catch (err) {
    const msg = String(err);
    if (msg.includes("Invalid PDF")) throw new Error("Not a valid PDF file.");
    throw new Error("Failed to open PDF: " + msg.replace("Error: ", ""));
  }

  const pages: PdfPage[] = [];

  for (let n = 1; n <= pdf.numPages; n++) {
    const page     = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: 1 });

    /* ── Render page to canvas (captures text, images, graphics, borders) ── */
    const renderScale    = 2; // 144 DPI — crisp and readable
    const renderViewport = page.getViewport({ scale: renderScale });
    const canvas         = document.createElement("canvas");
    canvas.width         = renderViewport.width;
    canvas.height        = renderViewport.height;
    const ctx            = canvas.getContext("2d")!;
    ctx.fillStyle        = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
    const imageBase64 = canvas.toDataURL("image/png").split(",")[1];

    /* ── Also extract plain text for word count / copy ── */
    const content   = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textLines = (content.items as any[])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((i: any) => typeof i.str === "string" && i.str.trim())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((i: any) => i.str.trim());

    pages.push({
      imageBase64,
      textLines,
      width:  viewport.width,
      height: viewport.height,
    });
  }

  if (!pages.length) {
    throw new Error("Could not read this PDF. Make sure it is not password-protected or corrupted.");
  }

  return { pages, pageCount: pdf.numPages };
}

/* ── Build .docx — each page as a full-page image ───────────── */

// docx library transformation.width/height are in pixels at 96 DPI (library multiplies by 9525 → EMU internally)
const PT_TO_96PX = 96 / 72; // 1 PDF point = 96/72 pixels at 96 DPI
const PT_TO_TWIP = 20;      // 1 PDF point = 20 twips (Word page size unit)

async function buildDocx(pages: PdfPage[]): Promise<Blob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { Document, Packer, Paragraph, ImageRun } = await import("docx") as any;

  const sections = pages.map((pg) => {
    const pgWTwip = Math.round(pg.width  * PT_TO_TWIP);
    const pgHTwip = Math.round(pg.height * PT_TO_TWIP);
    const pgWPx   = Math.round(pg.width  * PT_TO_96PX); // pixels at 96 DPI
    const pgHPx   = Math.round(pg.height * PT_TO_96PX);

    /* Convert base64 PNG → Uint8Array for docx */
    const binary = atob(pg.imageBase64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    return {
      properties: {
        page: {
          size:   { width: pgWTwip, height: pgHTwip },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              data: bytes,
              transformation: { width: pgWPx, height: pgHPx },
              type: "png",
            }),
          ],
        }),
      ],
    };
  });

  const doc = new Document({ sections });
  return Packer.toBlob(doc);
}

/* ── Component ──────────────────────────────────────────────── */

export default function PdfToWord() {
  const [pages,      setPages]      = useState<PdfPage[] | null>(null);
  const [pageCount,  setPageCount]  = useState(0);
  const [wordCount,  setWordCount]  = useState(0);
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [loadPct,    setLoadPct]    = useState(0);
  const [converting, setConverting] = useState(false);
  const [fileName,   setFileName]   = useState("");
  const [copied,     setCopied]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Please select a .pdf file."); return; }
    setLoading(true); setLoadPct(0); setError(""); setPages(null); setFileName(file.name);
    try {
      /* Stream progress while rendering pages */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjs = await import("pdfjs-dist") as any;
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }
      const pdfData = new Uint8Array(await file.arrayBuffer());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pdf: any;
      try {
        pdf = await pdfjs.getDocument({ data: pdfData, useWorkerFetch: false, isEvalSupported: false }).promise;
      } catch (err) {
        const msg = String(err);
        throw new Error(msg.includes("Invalid PDF") ? "Not a valid PDF file." : "Failed to open PDF: " + msg.replace("Error: ", ""));
      }

      const totalPages = pdf.numPages;
      const pages: PdfPage[] = [];

      for (let n = 1; n <= totalPages; n++) {
        setLoadPct(Math.round((n / totalPages) * 100));
        const page     = await pdf.getPage(n);
        const viewport = page.getViewport({ scale: 1 });

        const renderViewport = page.getViewport({ scale: 2 });
        const canvas         = document.createElement("canvas");
        canvas.width         = renderViewport.width;
        canvas.height        = renderViewport.height;
        const ctx            = canvas.getContext("2d")!;
        ctx.fillStyle        = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
        const imageBase64 = canvas.toDataURL("image/png").split(",")[1];

        const content   = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textLines = (content.items as any[])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((i: any) => typeof i.str === "string" && i.str.trim())
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((i: any) => i.str.trim());

        pages.push({ imageBase64, textLines, width: viewport.width, height: viewport.height });
      }

      setPages(pages);
      setPageCount(totalPages);
      const wc = pages.flatMap(p => p.textLines).join(" ").split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
    } catch (e) {
      setError(String(e).replace("Error: ", ""));
    } finally { setLoading(false); setLoadPct(0); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const downloadDocx = async () => {
    if (!pages) return;
    setConverting(true);
    try {
      const blob = await buildDocx(pages);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = fileName.replace(/\.pdf$/i, "") + ".docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Failed to build Word file: " + String(e).replace("Error: ", ""));
    } finally { setConverting(false); }
  };

  const copyText = async () => {
    const text = pages ? pages.flatMap(p => p.textLines).join("\n") : "";
    try { await navigator.clipboard.writeText(text); } catch { /**/ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#fdf4ff,#fae8ff 30%,#fff)", padding:"36px 40px 28px" }}>
        <p className="section-label mb-2" style={{ color:"#9333ea" }}>Document Tool</p>
        <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#9333ea,#7e22ce)" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(26px,3.5vw,48px)", color:"#0f0a1e" }}>
          PDF <span style={{ background:"linear-gradient(135deg,#9333ea,#7e22ce)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>→ Word</span>
        </h1>
        <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15, maxWidth:640 }}>
          Upload a PDF and download a <strong>.docx</strong> that looks exactly like your PDF — every page rendered pixel-perfect including graphics, logos, tables and borders. 100% in your browser.
        </p>
      </section>

      <div style={{ width:"100%", padding:"18px 40px 48px", flex:1, boxSizing:"border-box", maxWidth:980, margin:"0 auto" }}>

        {/* drop zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{ border:"2px dashed rgba(147,51,234,0.3)", borderRadius:18, padding:"48px 32px", textAlign:"center", cursor:"pointer", background:"rgba(147,51,234,0.03)", transition:"all 0.2s", marginBottom:20 }}
        >
          <input ref={fileRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div style={{ fontSize:48, marginBottom:12 }}>📄</div>
          <p style={{ fontSize:15, fontWeight:700, color:"#0f0a1e", marginBottom:4 }}>Drop a PDF here or click to upload</p>
          <p style={{ fontSize:12, color:"rgba(15,10,30,0.4)" }}>Accepts .pdf · Output: .docx with exact visual layout</p>
          {fileName && <p style={{ marginTop:10, fontSize:12, fontWeight:700, color:"#9333ea", fontFamily:"monospace" }}>📎 {fileName}</p>}
        </div>

        {/* loading */}
        {loading && (
          <div style={{ padding:"14px 20px", borderRadius:12, background:"rgba(147,51,234,0.05)", border:"1px solid rgba(147,51,234,0.15)", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:loadPct > 0 ? 10 : 0 }}>
              <span style={{ width:16, height:16, borderRadius:"50%", border:"2px solid #9333ea", borderTopColor:"transparent", display:"inline-block", animation:"spin 0.7s linear infinite", flexShrink:0 }} />
              <span style={{ fontSize:13, fontWeight:600, color:"#9333ea" }}>
                {loadPct > 0 ? `Rendering pages… ${loadPct}%` : "Opening PDF…"}
              </span>
            </div>
            {loadPct > 0 && (
              <div style={{ height:4, borderRadius:4, background:"rgba(147,51,234,0.12)", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${loadPct}%`, background:"linear-gradient(90deg,#9333ea,#7e22ce)", transition:"width 0.2s" }} />
              </div>
            )}
          </div>
        )}

        {/* error */}
        {error && (
          <div style={{ padding:"14px 18px", borderRadius:12, background:"rgba(225,29,72,0.05)", border:"1px solid rgba(225,29,72,0.18)", fontSize:13, color:"#e11d48", marginBottom:16 }}>
            <strong>✕ Failed:</strong> {error}
          </div>
        )}

        {/* result */}
        {pages && (
          <div>
            {/* meta + actions */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14, alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:7, background:"rgba(147,51,234,0.08)", border:"1px solid rgba(147,51,234,0.18)", color:"#7e22ce" }}>
                {wordCount.toLocaleString()} words
              </span>
              {pageCount > 0 && (
                <span style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:7, background:"rgba(8,145,178,0.07)", border:"1px solid rgba(8,145,178,0.14)", color:"#0284c7" }}>
                  {pageCount} page{pageCount !== 1 ? "s" : ""}
                </span>
              )}
              <span style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:7, background:"rgba(5,150,105,0.07)", border:"1px solid rgba(5,150,105,0.14)", color:"#059669" }}>
                ✓ Ready
              </span>

              <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                <button
                  onClick={copyText}
                  style={{ padding:"7px 16px", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", background:copied?"rgba(5,150,105,0.08)":"rgba(147,51,234,0.07)", color:copied?"#059669":"#9333ea", border:`1px solid ${copied?"rgba(5,150,105,0.2)":"rgba(147,51,234,0.18)"}` }}
                >
                  {copied ? "✓ Copied!" : "Copy Text"}
                </button>
                <button
                  onClick={downloadDocx}
                  disabled={converting}
                  style={{ padding:"9px 22px", borderRadius:9, fontSize:13, fontWeight:700, cursor:converting?"wait":"pointer", background:"linear-gradient(135deg,#9333ea,#7e22ce)", color:"#fff", border:"none", boxShadow:"0 4px 14px rgba(147,51,234,0.35)", opacity:converting?0.75:1, display:"flex", alignItems:"center", gap:7 }}
                >
                  {converting
                    ? <><span style={{ width:12, height:12, borderRadius:"50%", border:"2px solid #fff", borderTopColor:"transparent", display:"inline-block", animation:"spin 0.7s linear infinite" }} /> Building…</>
                    : "⬇ Download Word"}
                </button>
              </div>
            </div>

            {/* pixel-perfect preview — the same images that go into the Word file */}
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>
              Preview (exact)
            </label>
            <div style={{ border:"1px solid rgba(147,51,234,0.15)", borderRadius:14, background:"#e5e7eb", padding:16, maxHeight:680, overflowY:"auto" }}>
              {pages.map((pg, pi) => (
                <div key={pi} style={{ marginBottom: pi < pages.length - 1 ? 16 : 0 }}>
                  {pi > 0 && (
                    <div style={{ textAlign:"center", fontSize:10, color:"rgba(147,51,234,0.45)", fontWeight:600, marginBottom:8 }}>
                      — Page {pi + 1} —
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${pg.imageBase64}`}
                    alt={`Page ${pi + 1}`}
                    style={{ display:"block", width:"100%", maxWidth:680, margin:"0 auto", boxShadow:"0 2px 14px rgba(0,0,0,0.14)", borderRadius:2 }}
                  />
                </div>
              ))}
            </div>

            <p style={{ marginTop:8, fontSize:11, color:"rgba(15,10,30,0.4)", fontStyle:"italic" }}>
              The Word file contains the same images — visually identical to the original PDF, including all graphics, logos and borders.
            </p>
          </div>
        )}

        {/* how it works */}
        {!pages && !loading && !error && (
          <div style={{ background:"rgba(147,51,234,0.04)", border:"1px solid rgba(147,51,234,0.1)", borderRadius:14, padding:"20px 24px" }}>
            <p style={{ fontSize:13, fontWeight:700, color:"#7e22ce", marginBottom:8 }}>ℹ How it works</p>
            <ul style={{ fontSize:12, color:"rgba(15,10,30,0.55)", lineHeight:2, paddingLeft:16 }}>
              <li>Upload any PDF — text-based or scanned, any layout</li>
              <li>Each page is rendered at high resolution including all graphics, logos, tables and borders</li>
              <li>The output <strong>.docx</strong> looks identical to the PDF when opened in Microsoft Word</li>
              <li>Works entirely in your browser — your file is never uploaded anywhere</li>
            </ul>
          </div>
        )}

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#9333ea", textDecoration:"none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(147,51,234,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · PDF → Word</p>
      </footer>
    </div>
  );
}
