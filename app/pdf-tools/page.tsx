"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

type SizeUnit = "KB" | "MB";
type ToolState = "idle" | "processing" | "done" | "error";

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/* ── pdfjs loader ── */
let _workerSet = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPdfjs(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = await import("pdfjs-dist") as any;
  if (!_workerSet) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    _workerSet = true;
  }
  return pdfjs;
}

/* ── Build a valid PDF from JPEG pages ── */
interface JpegPage { jpeg: Uint8Array; pw: number; ph: number; iw: number; ih: number }

function buildPdfFromJpegs(pages: JpegPage[]): Uint8Array {
  const enc    = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[]    = [];
  let pos = 0;

  const t = (s: string)        => { const b = enc.encode(s); chunks.push(b); pos += b.length; };
  const b = (bytes: Uint8Array) => { chunks.push(bytes);      pos += bytes.length; };
  const mark = (n: number)      => { offsets[n] = pos; };

  t("%PDF-1.4\n");

  const N    = pages.length;
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");

  mark(1); t(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  mark(2); t(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${N} >>\nendobj\n`);

  for (let i = 0; i < N; i++) {
    const { jpeg, pw, ph, iw, ih } = pages[i];
    const pn = 3 + i * 3, cn = 4 + i * 3, xn = 5 + i * 3;
    const cs = enc.encode(`q ${pw} 0 0 ${ph} 0 0 cm /Im${i + 1} Do Q`);

    mark(pn);
    t(`${pn} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Contents ${cn} 0 R /Resources << /XObject << /Im${i + 1} ${xn} 0 R >> >> >>\nendobj\n`);

    mark(cn);
    t(`${cn} 0 obj\n<< /Length ${cs.length} >>\nstream\n`);
    b(cs);
    t(`\nendstream\nendobj\n`);

    mark(xn);
    t(`${xn} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    b(jpeg);
    t(`\nendstream\nendobj\n`);
  }

  const xrefPos  = pos;
  const totalObj = 2 + N * 3;
  t(`xref\n0 ${totalObj + 1}\n`);
  t("0000000000 65535 f \n");
  for (let n = 1; n <= totalObj; n++) {
    t(String(offsets[n] ?? 0).padStart(10, "0") + " 00000 n \n");
  }
  t(`trailer\n<< /Size ${totalObj + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  const result = new Uint8Array(pos);
  let off = 0;
  for (const c of chunks) { result.set(c, off); off += c.length; }
  return result;
}

/* ── Core processing ── */
async function targetPdfSize(
  file: File,
  targetBytes: number,
  onProgress: (msg: string) => void,
): Promise<{ pdfBytes: Uint8Array; pageCount: number }> {
  onProgress("Loading PDF…");
  const pdfjs = await loadPdfjs();
  const data  = new Uint8Array(await file.arrayBuffer());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdf: any;
  try {
    pdf = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
  } catch (err) {
    const msg = String(err);
    if (msg.includes("Invalid PDF")) throw new Error("Not a valid PDF file.");
    throw new Error("Failed to open PDF: " + msg.replace("Error: ", ""));
  }

  const N = pdf.numPages;

  /* Render all pages at initial scale */
  const RENDER_SCALE = 1.5; // 108 DPI — good quality baseline
  type Rendered = { canvas: HTMLCanvasElement; pw: number; ph: number };
  const rendered: Rendered[] = [];

  for (let i = 1; i <= N; i++) {
    onProgress(`Rendering page ${i} / ${N}…`);
    const page = await pdf.getPage(i);
    const vp1  = page.getViewport({ scale: 1.0 });
    const vp   = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width  = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
    rendered.push({ canvas, pw: Math.round(vp1.width), ph: Math.round(vp1.height) });
  }

  const encodeJpeg = (canvas: HTMLCanvasElement, q: number): Promise<Uint8Array> =>
    new Promise(res => canvas.toBlob(bl => bl!.arrayBuffer().then(ab => res(new Uint8Array(ab))), "image/jpeg", q));

  /* Estimate overhead: ~500 bytes per page + 300 fixed */
  const overhead    = N * 500 + 300;
  const jpegBudget  = Math.max(N * 1024, targetBytes - overhead);
  const totalPixels = rendered.reduce((s, r) => s + r.canvas.width * r.canvas.height, 0);

  /* Binary-search quality using first-page sampling */
  onProgress("Optimising quality…");
  let lo = 0.05, hi = 1.0, bestQ = 0.8;

  for (let iter = 0; iter < 14; iter++) {
    const mid    = (lo + hi) / 2;
    const sample = await encodeJpeg(rendered[0].canvas, mid);
    // Estimate total JPEG size proportionally (bytes per pixel from sample)
    const bpp      = sample.length / (rendered[0].canvas.width * rendered[0].canvas.height);
    const estimated = bpp * totalPixels;
    if (estimated <= jpegBudget) { bestQ = mid; lo = mid; }
    else hi = mid;
    onProgress(`Quality: ${Math.round(bestQ * 100)}%`);
  }

  /* If even q=0.05 is still too large, we need to lower resolution */
  /* Check by encoding first page at bestQ and extrapolating */
  const sampleFinal = await encodeJpeg(rendered[0].canvas, bestQ);
  const bppFinal    = sampleFinal.length / (rendered[0].canvas.width * rendered[0].canvas.height);
  const estFinal    = bppFinal * totalPixels + overhead;

  let encodedJpegs: Uint8Array[];

  if (estFinal > targetBytes * 1.3) {
    /* Re-render at lower scale and try again */
    const scaleFactor = Math.sqrt(targetBytes / estFinal) * 0.9;
    const lowScale    = Math.max(0.3, RENDER_SCALE * scaleFactor);
    onProgress(`Re-rendering at lower resolution…`);

    for (let i = 0; i < N; i++) {
      const page   = await pdf.getPage(i + 1);
      const vp     = page.getViewport({ scale: lowScale });
      const canvas = rendered[i].canvas;
      canvas.width  = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
    }
    /* Re-run quality search at new scale */
    lo = 0.05; hi = 1.0; bestQ = 0.5;
    const totalPx2 = rendered.reduce((s, r) => s + r.canvas.width * r.canvas.height, 0);
    for (let iter = 0; iter < 12; iter++) {
      const mid    = (lo + hi) / 2;
      const sample = await encodeJpeg(rendered[0].canvas, mid);
      const bpp2   = sample.length / (rendered[0].canvas.width * rendered[0].canvas.height);
      if (bpp2 * totalPx2 <= jpegBudget) { bestQ = mid; lo = mid; } else hi = mid;
    }
  }

  /* Encode all pages */
  encodedJpegs = [];
  for (let i = 0; i < N; i++) {
    onProgress(`Encoding page ${i + 1} / ${N}…`);
    encodedJpegs.push(await encodeJpeg(rendered[i].canvas, bestQ));
  }

  /* Build PDF */
  onProgress("Building PDF…");
  const jpegPages: JpegPage[] = rendered.map((r, i) => ({
    jpeg: encodedJpegs[i],
    pw: r.pw, ph: r.ph,
    iw: r.canvas.width, ih: r.canvas.height,
  }));

  return { pdfBytes: buildPdfFromJpegs(jpegPages), pageCount: N };
}

/* ══════════════════════════════════════════════════════ */
export default function PdfToolsPage() {
  const [file, setFile]         = useState<File | null>(null);
  const [targetVal, setTargetVal] = useState("500");
  const [unit, setUnit]         = useState<SizeUnit>("KB");
  const [state, setState]       = useState<ToolState>("idle");
  const [progress, setProgress] = useState("");
  const [result, setResult]     = useState<{ pdfBytes: Uint8Array; pageCount: number; url: string } | null>(null);
  const [error, setError]       = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback((f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file."); return;
    }
    setFile(f); setResult(null); setError("");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, [pickFile]);

  const process = async () => {
    if (!file) return;
    const targetNum = parseFloat(targetVal);
    if (isNaN(targetNum) || targetNum <= 0) { setError("Enter a valid target size greater than 0."); return; }
    const targetBytes = unit === "KB" ? targetNum * 1024 : targetNum * 1024 * 1024;

    setState("processing"); setError(""); setProgress("Starting…");
    try {
      if (result?.url) URL.revokeObjectURL(result.url);
      const res  = await targetPdfSize(file, targetBytes, setProgress);
      const blob = new Blob([res.pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResult({ ...res, url: URL.createObjectURL(blob) });
      setState("done");
    } catch (e) {
      setError(String(e).replace(/^Error:\s*/, "")); setState("error");
    }
  };

  const origName = file ? file.name.replace(/\.pdf$/i, "") : "document";
  const isIncreasing = result && file && result.pdfBytes.length > file.size;

  return (
    <div style={{ background: "#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg,#f5f3ff,#f0f4ff 50%,#fff)", padding: "36px 40px 28px" }}>
        <p className="section-label mb-2">File Tool</p>
        <div className="section-line" style={{ margin: "0 0 12px" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize: "clamp(26px,3.5vw,48px)", color: "#0f0a1e" }}>
          PDF <span className="text-gradient-purple">Size</span> Adjuster
        </h1>
        <p style={{ color: "rgba(15,10,30,0.5)", fontSize: 15, maxWidth: 620 }}>
          Compress or expand any PDF to an exact target size in KB or MB.
          Pages are re-rendered at the optimal resolution for the target size.
        </p>
      </section>

      <div style={{ width: "100%", padding: "28px 40px 56px", flex: 1, boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 32, alignItems: "start", flexWrap: "wrap" }}>

          {/* ── LEFT: upload + settings ── */}
          <div style={{ flex: "0 0 340px", minWidth: 260, display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dragging ? "#7c3aed" : "rgba(124,58,237,0.25)"}`,
                borderRadius: 16, padding: "40px 20px",
                textAlign: "center", background: dragging ? "rgba(124,58,237,0.04)" : "#fafbff",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {file ? (
                <>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f0a1e", wordBreak: "break-all" }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(15,10,30,0.4)", marginTop: 4 }}>{fmtBytes(file.size)}</div>
                  <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 8, fontWeight: 600 }}>Click to change file</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 52, marginBottom: 10 }}>📄</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f0a1e" }}>Drop PDF here</div>
                  <div style={{ fontSize: 12, color: "rgba(15,10,30,0.45)", marginTop: 4 }}>or click to browse</div>
                </>
              )}
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} />
            </div>

            {/* Info notice */}
            <div style={{ padding: "11px 14px", borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.22)", fontSize: 12, color: "#78350f", lineHeight: 1.6 }}>
              <strong>Note:</strong> Pages are re-rendered as high-quality images. Text will not be
              selectable in the output PDF — ideal for scanned or image-heavy documents.
            </div>

            {/* Target size */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(15,10,30,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>
                Target File Size
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number" min="0.1" step="any" value={targetVal}
                  onChange={e => setTargetVal(e.target.value)}
                  style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(124,58,237,0.22)", fontSize: 16, fontWeight: 700, color: "#0f0a1e", background: "#fafbff", outline: "none" }}
                />
                <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(124,58,237,0.22)" }}>
                  {(["KB", "MB"] as SizeUnit[]).map(u => (
                    <button key={u} onClick={() => setUnit(u)} style={{ padding: "11px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: unit === u ? "#7c3aed" : "#fff", color: unit === u ? "#fff" : "rgba(15,10,30,0.5)", border: "none", transition: "all 0.15s" }}>{u}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Process button */}
            <button
              onClick={process}
              disabled={!file || state === "processing"}
              style={{
                padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 800, border: "none",
                cursor: file && state !== "processing" ? "pointer" : "not-allowed",
                background: file ? "#7c3aed" : "rgba(124,58,237,0.25)", color: "#fff",
                boxShadow: file ? "0 4px 18px rgba(124,58,237,0.32)" : "none",
                transition: "all 0.15s",
              }}
            >
              {state === "processing" ? `⏳ ${progress}` : "⚡ Adjust PDF Size"}
            </button>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.2)", fontSize: 12, color: "#e11d48", lineHeight: 1.5 }}>
                {error}
              </div>
            )}
          </div>

          {/* ── RIGHT: result ── */}
          <div style={{ flex: 1, minWidth: 280 }}>
            {result ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* PDF card */}
                <div style={{ borderRadius: 16, border: "1px solid rgba(124,58,237,0.14)", background: "linear-gradient(135deg,#f5f3ff,#fafbff)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 220, padding: "40px 24px", gap: 14 }}>
                  <div style={{ fontSize: 80 }}>📄</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f0a1e", textAlign: "center" }}>
                    {origName}_adjusted.pdf
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#7c3aed" }}>{fmtBytes(result.pdfBytes.length)}</div>
                  <div style={{ fontSize: 12, color: "rgba(15,10,30,0.4)" }}>{result.pageCount} page{result.pageCount !== 1 ? "s" : ""}</div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                  {[
                    { label: "Output Size", value: fmtBytes(result.pdfBytes.length), color: "#059669" },
                    { label: "Pages",       value: String(result.pageCount),          color: "#0891b2" },
                    { label: isIncreasing ? "Increased" : "Reduced",
                      value: file ? `${isIncreasing ? "+" : ""}${Math.round((result.pdfBytes.length / file.size - 1) * 100)}%` : "—",
                      color: isIncreasing ? "#d97706" : "#7c3aed" },
                  ].map(s => (
                    <div key={s.label} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(124,58,237,0.1)", background: "#fafbff" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(15,10,30,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Before → after */}
                {file && (
                  <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.1)", fontSize: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ color: "rgba(15,10,30,0.5)" }}>Before: <strong style={{ color: "#0f0a1e" }}>{fmtBytes(file.size)}</strong></span>
                    <span style={{ color: "rgba(124,58,237,0.4)", fontSize: 16 }}>→</span>
                    <span style={{ color: "rgba(15,10,30,0.5)" }}>After: <strong style={{ color: "#059669" }}>{fmtBytes(result.pdfBytes.length)}</strong></span>
                  </div>
                )}

                {/* Download */}
                <a
                  href={result.url}
                  download={`${origName}_${fmtBytes(result.pdfBytes.length).replace(/\s/, "")}.pdf`}
                  style={{ display: "block", padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 800, textAlign: "center", background: "#059669", color: "#fff", textDecoration: "none", boxShadow: "0 4px 18px rgba(5,150,105,0.28)" }}
                >
                  ⬇ Download PDF · {fmtBytes(result.pdfBytes.length)}
                </a>
              </div>
            ) : (
              <div style={{ background: "#fafbff", border: "1px dashed rgba(124,58,237,0.18)", borderRadius: 16, minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "rgba(15,10,30,0.3)", fontSize: 15, fontWeight: 600, padding: 32, textAlign: "center" }}>
                <span style={{ fontSize: 52 }}>📄</span>
                Result will appear here
                <span style={{ fontSize: 12, fontWeight: 400, maxWidth: 280, lineHeight: 1.7 }}>
                  1. Upload a PDF<br />
                  2. Enter your target size<br />
                  3. Click Adjust — then download
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 44 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#7c3aed", textDecoration: "none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop: "1px solid rgba(124,58,237,0.1)", fontSize: 13, color: "rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · PDF Size Adjuster</p>
      </footer>
    </div>
  );
}
