"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

/* ── PDF text extraction (pdfjs-dist) ──────────────────────── */

let _pdfjsWorkerSet = false;

interface PdfPage { lines: PdfLine[] }
interface PdfLine  { text: string; fontSize: number; isBold: boolean }

async function extractPdfPages(file: File): Promise<{ pages: PdfPage[]; pageCount: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = await import("pdfjs-dist") as any;
  if (!_pdfjsWorkerSet) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    _pdfjsWorkerSet = true;
  }

  const data = new Uint8Array(await file.arrayBuffer());
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
    const page    = await pdf.getPage(n);
    const content = await page.getTextContent();
    const items   = (content.items as any[]).filter((i: any) => typeof i.str === "string");

    /* Group items into visual lines using their y-coordinate */
    const lineMap = new Map<number, any[]>();
    for (const item of items) {
      /* transform[5] is the y position — round to nearest 2px to merge fragments */
      const y = Math.round((item.transform?.[5] ?? 0) / 2) * 2;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push(item);
    }

    /* Sort lines top-to-bottom (PDF y goes upward, so descending) */
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

    const lines: PdfLine[] = [];
    for (const y of sortedYs) {
      const its  = lineMap.get(y)!.sort((a: any, b: any) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0));
      const text = its.map((i: any) => i.str).join("").trim();
      if (!text) continue;
      /* Font size from transform matrix: sqrt(c²+d²) or item.height */
      const fontSize = its[0]?.height || Math.abs(its[0]?.transform?.[3] ?? 12);
      const fontName: string = (its[0]?.fontName ?? "").toLowerCase();
      const isBold = fontName.includes("bold") || fontName.includes("heavy");
      lines.push({ text, fontSize, isBold });
    }

    if (lines.length) pages.push({ lines });
  }

  if (!pages.length) {
    throw new Error(
      "No text layer found. This PDF is a scanned image — an OCR tool is needed to extract text from it."
    );
  }

  return { pages, pageCount: pdf.numPages };
}

/* ── Build .docx using the docx library ──────────────────────── */

async function buildDocx(pages: PdfPage[], baseFontSize: number): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];

  for (let pi = 0; pi < pages.length; pi++) {
    const { lines } = pages[pi];

    for (const line of lines) {
      const ratio = baseFontSize > 0 ? line.fontSize / baseFontSize : 1;

      /* Heading detection: significantly larger or bold short line */
      let headingLevel: typeof HeadingLevel[keyof typeof HeadingLevel] | null = null;
      if (ratio >= 1.8 || (ratio >= 1.4 && line.isBold)) headingLevel = HeadingLevel.HEADING_1;
      else if (ratio >= 1.3 || (ratio >= 1.1 && line.isBold && line.text.length < 80)) headingLevel = HeadingLevel.HEADING_2;
      else if (ratio >= 1.15) headingLevel = HeadingLevel.HEADING_3;

      if (headingLevel) {
        children.push(
          new Paragraph({
            heading: headingLevel,
            children: [new TextRun({ text: line.text, bold: true })],
            spacing: { before: 240, after: 120 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.text,
                bold: line.isBold,
                size: Math.round(Math.max(16, Math.min(28, line.fontSize * 2))),
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }
    }

    /* Page break between pages (except last) */
    if (pi < pages.length - 1) {
      children.push(new Paragraph({ children: [], pageBreakBefore: true }));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 24 },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children,
    }],
  });

  return Packer.toBlob(doc);
}

/* ── Component ──────────────────────────────────────────────── */

export default function PdfToWord() {
  const [pages,     setPages]     = useState<PdfPage[] | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [converting, setConverting] = useState(false);
  const [fileName,  setFileName]  = useState("");
  const [copied,    setCopied]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Please select a .pdf file."); return; }
    setLoading(true); setError(""); setPages(null); setFileName(file.name);
    try {
      const { pages: p, pageCount: pc } = await extractPdfPages(file);
      setPages(p);
      setPageCount(pc);
      const wc = p.flatMap(pg => pg.lines).map(l => l.text).join(" ").split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
    } catch (e) {
      setError(String(e).replace("Error: ", ""));
    } finally { setLoading(false); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  /* Compute median font size across all lines → used as "body text" baseline */
  const baseFontSize = (() => {
    if (!pages) return 12;
    const sizes = pages.flatMap(p => p.lines.map(l => l.fontSize)).filter(s => s > 0).sort((a,b) => a-b);
    return sizes[Math.floor(sizes.length / 2)] ?? 12;
  })();

  const downloadDocx = async () => {
    if (!pages) return;
    setConverting(true);
    try {
      const blob = await buildDocx(pages, baseFontSize);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = fileName.replace(/\.pdf$/i, "") + ".docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Failed to build Word file: " + String(e).replace("Error: ",""));
    } finally { setConverting(false); }
  };

  const previewText = pages ? pages.flatMap(p => p.lines.map(l => l.text)).join("\n") : "";

  const copy = async () => {
    try { await navigator.clipboard.writeText(previewText); } catch { /**/ }
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
        <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15, maxWidth:620 }}>
          Upload a PDF and download a real <strong>.docx</strong> Microsoft Word file — with headings, paragraphs and font sizes preserved. Works with text-based PDFs. 100% in your browser.
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
          <p style={{ fontSize:12, color:"rgba(15,10,30,0.4)" }}>Accepts .pdf · Output: real .docx Microsoft Word file</p>
          {fileName && <p style={{ marginTop:10, fontSize:12, fontWeight:700, color:"#9333ea", fontFamily:"monospace" }}>📎 {fileName}</p>}
        </div>

        {/* loading */}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 20px", borderRadius:12, background:"rgba(147,51,234,0.05)", border:"1px solid rgba(147,51,234,0.15)", marginBottom:16 }}>
            <span style={{ width:16, height:16, borderRadius:"50%", border:"2px solid #9333ea", borderTopColor:"transparent", display:"inline-block", animation:"spin 0.7s linear infinite" }} />
            <span style={{ fontSize:13, fontWeight:600, color:"#9333ea" }}>Reading PDF…</span>
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
                ✓ Ready to convert
              </span>

              <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                <button
                  onClick={copy}
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
                    : "⬇ Download .docx"}
                </button>
              </div>
            </div>

            {/* preview */}
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>
              Document Preview
            </label>
            <div style={{ border:"1px solid rgba(147,51,234,0.15)", borderRadius:14, background:"#faf9ff", minHeight:480, maxHeight:600, overflowY:"auto", padding:"28px 32px", fontFamily:"Georgia, 'Times New Roman', serif" }}>
              {pages.map((pg, pi) => (
                <div key={pi}>
                  {pg.lines.map((line, li) => {
                    const ratio = baseFontSize > 0 ? line.fontSize / baseFontSize : 1;
                    const isH1  = ratio >= 1.8 || (ratio >= 1.4 && line.isBold);
                    const isH2  = !isH1 && (ratio >= 1.3 || (ratio >= 1.1 && line.isBold && line.text.length < 80));
                    const isH3  = !isH1 && !isH2 && ratio >= 1.15;
                    const fs    = isH1 ? 22 : isH2 ? 18 : isH3 ? 15 : 14;
                    return (
                      <p key={li} style={{ fontSize:fs, fontWeight:isH1||isH2||isH3||line.isBold?"bold":"normal", color:"#0f0a1e", marginBottom:isH1?12:isH2?8:6, lineHeight:1.7 }}>
                        {line.text}
                      </p>
                    );
                  })}
                  {pi < pages.length - 1 && (
                    <div style={{ margin:"20px 0", borderTop:"1px dashed rgba(147,51,234,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:10, color:"rgba(147,51,234,0.4)", fontWeight:600, padding:"2px 10px", background:"#faf9ff" }}>— Page {pi+2} —</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p style={{ marginTop:8, fontSize:11, color:"rgba(15,10,30,0.4)", fontStyle:"italic" }}>
              Preview shows the extracted content. Click <strong>Download .docx</strong> to get a real Microsoft Word file.
            </p>
          </div>
        )}

        {/* how it works */}
        {!pages && !loading && !error && (
          <div style={{ background:"rgba(147,51,234,0.04)", border:"1px solid rgba(147,51,234,0.1)", borderRadius:14, padding:"20px 24px" }}>
            <p style={{ fontSize:13, fontWeight:700, color:"#7e22ce", marginBottom:8 }}>ℹ How it works</p>
            <ul style={{ fontSize:12, color:"rgba(15,10,30,0.55)", lineHeight:2, paddingLeft:16 }}>
              <li>Upload any text-based PDF (made by Word, Google Docs, LibreOffice, LaTeX, etc.)</li>
              <li>Text is extracted page-by-page — headings and font sizes are detected automatically</li>
              <li>Click <strong>Download .docx</strong> to get a real Microsoft Word file you can open and edit</li>
              <li><strong>Note:</strong> Scanned PDFs (photos of text) have no text layer — OCR would be needed</li>
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
