"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

type SizeUnit = "KB" | "MB";
type OutputFmt = "image/jpeg" | "image/webp" | "image/png";
type ToolState = "idle" | "processing" | "done" | "error";

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Cannot decode image.")); };
    img.src = url;
  });
}

function encodeCanvas(canvas: HTMLCanvasElement, mime: string, q: number): Promise<Blob> {
  return new Promise(res => canvas.toBlob(b => res(b!), mime, q));
}

interface ProcessResult { blob: Blob; width: number; height: number; quality: number }

async function targetImageSize(
  file: File,
  targetBytes: number,
  mime: OutputFmt,
  onProgress: (msg: string) => void,
): Promise<ProcessResult> {
  const img = await loadImage(file);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  const canvas = document.createElement("canvas");
  const ctx    = canvas.getContext("2d")!;

  const encode = async (w: number, h: number, q: number): Promise<Blob> => {
    canvas.width  = Math.round(w);
    canvas.height = Math.round(h);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return encodeCanvas(canvas, mime, q);
  };

  onProgress("Measuring…");
  const maxBlob = await encode(origW, origH, 1.0);

  /* ─── SIZE INCREASE: upscale dimensions ─── */
  if (maxBlob.size < targetBytes) {
    onProgress("Target larger than original — upscaling…");
    let lo = 1.0, hi = 1.5;
    // Expand upper bound until we exceed target or hit 4× limit
    while (hi < 4.0) {
      const b = await encode(origW * hi, origH * hi, 1.0);
      if (b.size >= targetBytes) break;
      hi *= 1.5;
    }
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      const b   = await encode(origW * mid, origH * mid, 1.0);
      if (b.size < targetBytes) lo = mid; else hi = mid;
      onProgress(`Upscaling… ×${lo.toFixed(2)}`);
    }
    const fw = Math.round(origW * lo), fh = Math.round(origH * lo);
    return { blob: await encode(fw, fh, 1.0), width: fw, height: fh, quality: 1.0 };
  }

  /* ─── SIZE REDUCE: binary search quality first ─── */
  onProgress("Searching quality…");
  let loQ = 0.01, hiQ = 1.0, bestBlob = maxBlob, bestQ = 1.0;
  for (let i = 0; i < 16; i++) {
    const midQ = (loQ + hiQ) / 2;
    const b    = await encode(origW, origH, midQ);
    if (b.size <= targetBytes) { bestBlob = b; bestQ = midQ; loQ = midQ; }
    else hiQ = midQ;
    onProgress(`Quality: ${Math.round(bestQ * 100)}%`);
  }
  if (bestBlob.size <= targetBytes) {
    return { blob: bestBlob, width: origW, height: origH, quality: bestQ };
  }

  /* ─── Also shrink dimensions ─── */
  onProgress("Reducing dimensions…");
  let loS = 0.05, hiS = 1.0, bw = origW, bh = origH;
  for (let i = 0; i < 16; i++) {
    const mid = (loS + hiS) / 2;
    const b   = await encode(origW * mid, origH * mid, 0.6);
    if (b.size <= targetBytes) { loS = mid; bw = Math.round(origW * mid); bh = Math.round(origH * mid); }
    else hiS = mid;
    onProgress(`Dimensions: ${Math.round(loS * 100)}%`);
  }
  loQ = 0.01; hiQ = 1.0;
  for (let i = 0; i < 12; i++) {
    const midQ = (loQ + hiQ) / 2;
    const b    = await encode(bw, bh, midQ);
    if (b.size <= targetBytes) { bestBlob = b; bestQ = midQ; loQ = midQ; }
    else hiQ = midQ;
  }
  return { blob: bestBlob, width: bw, height: bh, quality: bestQ };
}

/* ══════════════════════════════════════════════════════ */
export default function ImageToolsPage() {
  const [file, setFile]           = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetVal, setTargetVal] = useState("200");
  const [unit, setUnit]           = useState<SizeUnit>("KB");
  const [fmt, setFmt]             = useState<OutputFmt>("image/jpeg");
  const [state, setState]         = useState<ToolState>("idle");
  const [progress, setProgress]   = useState("");
  const [result, setResult]       = useState<(ProcessResult & { url: string }) | null>(null);
  const [error, setError]         = useState("");
  const [dragging, setDragging]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please select an image file (JPEG, PNG, WebP…)."); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResult(null);
    setError("");
  }, [previewUrl]);

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
      const res = await targetImageSize(file, targetBytes, fmt, setProgress);
      if (result?.url) URL.revokeObjectURL(result.url);
      setResult({ ...res, url: URL.createObjectURL(res.blob) });
      setState("done");
    } catch (e) {
      setError(String(e).replace(/^Error:\s*/, "")); setState("error");
    }
  };

  const ext        = fmt === "image/jpeg" ? "jpg" : fmt === "image/webp" ? "webp" : "png";
  const origName   = file ? file.name.replace(/\.[^.]+$/, "") : "image";
  const isIncreasing = result && file && result.blob.size > file.size;

  const tabBtn = (active: boolean, color = "#7c3aed"): React.CSSProperties => ({
    padding: "9px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${active ? color : "rgba(0,0,0,0.09)"}`,
    background: active ? color : "rgba(0,0,0,0.04)",
    color: active ? "#fff" : "rgba(15,10,30,0.55)",
    transition: "all 0.15s",
  });

  return (
    <div style={{ background: "#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg,#f5f3ff,#f0f4ff 50%,#fff)", padding: "36px 40px 28px" }}>
        <p className="section-label mb-2">File Tool</p>
        <div className="section-line" style={{ margin: "0 0 12px" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize: "clamp(26px,3.5vw,48px)", color: "#0f0a1e" }}>
          Image <span className="text-gradient-purple">Size</span> Adjuster
        </h1>
        <p style={{ color: "rgba(15,10,30,0.5)", fontSize: 15, maxWidth: 620 }}>
          Resize any image to an exact target file size — enter KB or MB, choose format, and download.
          Works for both reducing and increasing file size.
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
                borderRadius: 16, padding: file ? "16px" : "36px 20px",
                textAlign: "center", background: dragging ? "rgba(124,58,237,0.04)" : "#fafbff",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {file && previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 10, marginBottom: 10, objectFit: "contain", display: "block", margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f0a1e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(15,10,30,0.4)", marginTop: 2 }}>
                    {fmtBytes(file.size)}
                  </div>
                  <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 8, fontWeight: 600 }}>Click to change file</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>🖼️</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f0a1e" }}>Drop image here</div>
                  <div style={{ fontSize: 12, color: "rgba(15,10,30,0.45)", marginTop: 4 }}>or click to browse</div>
                  <div style={{ fontSize: 11, color: "rgba(15,10,30,0.3)", marginTop: 6 }}>JPEG · PNG · WebP · GIF</div>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} />
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

            {/* Output format */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(15,10,30,0.4)", letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>
                Output Format
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {([["image/jpeg", "JPEG"], ["image/webp", "WebP"], ["image/png", "PNG"]] as [OutputFmt, string][]).map(([m, label]) => (
                  <button key={m} onClick={() => setFmt(m)} style={tabBtn(fmt === m)}>{label}</button>
                ))}
              </div>
              {fmt === "image/png" && (
                <p style={{ fontSize: 11, color: "rgba(15,10,30,0.45)", marginTop: 6, lineHeight: 1.5 }}>
                  PNG is lossless — only dimension scaling is used to hit the target.
                </p>
              )}
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
              {state === "processing" ? `⏳ ${progress}` : "⚡ Adjust Image Size"}
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
                {/* Output preview */}
                <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(124,58,237,0.14)", background: "repeating-conic-gradient(#f0f0f0 0% 25%, #fff 0% 50%) 0 0 / 16px 16px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 220, padding: 16 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.url} alt="Output" style={{ maxWidth: "100%", maxHeight: 340, objectFit: "contain", borderRadius: 8, boxShadow: "0 2px 24px rgba(0,0,0,0.12)" }} />
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                  {[
                    { label: "Output Size", value: fmtBytes(result.blob.size), color: "#059669" },
                    { label: "Dimensions",  value: `${result.width} × ${result.height}`, color: "#0891b2" },
                    { label: isIncreasing ? "Increased" : "Reduced",
                      value: file ? `${isIncreasing ? "+" : ""}${Math.round((result.blob.size / file.size - 1) * 100)}%` : "—",
                      color: isIncreasing ? "#d97706" : "#7c3aed" },
                  ].map(s => (
                    <div key={s.label} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(124,58,237,0.1)", background: "#fafbff" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(15,10,30,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: s.color, wordBreak: "break-all" }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Before → after bar */}
                {file && (
                  <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.1)", fontSize: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ color: "rgba(15,10,30,0.5)" }}>Before: <strong style={{ color: "#0f0a1e" }}>{fmtBytes(file.size)}</strong></span>
                    <span style={{ color: "rgba(124,58,237,0.4)", fontSize: 16 }}>→</span>
                    <span style={{ color: "rgba(15,10,30,0.5)" }}>After: <strong style={{ color: "#059669" }}>{fmtBytes(result.blob.size)}</strong></span>
                    {result.quality < 1 && fmt !== "image/png" && (
                      <span style={{ marginLeft: "auto", color: "rgba(15,10,30,0.35)" }}>Quality: {Math.round(result.quality * 100)}%</span>
                    )}
                  </div>
                )}

                {/* Download */}
                <a
                  href={result.url}
                  download={`${origName}_${fmtBytes(result.blob.size).replace(/\s/, "")}.${ext}`}
                  style={{ display: "block", padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 800, textAlign: "center", background: "#059669", color: "#fff", textDecoration: "none", boxShadow: "0 4px 18px rgba(5,150,105,0.28)" }}
                >
                  ⬇ Download {ext.toUpperCase()} · {fmtBytes(result.blob.size)}
                </a>
              </div>
            ) : (
              <div style={{ background: "#fafbff", border: "1px dashed rgba(124,58,237,0.18)", borderRadius: 16, minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "rgba(15,10,30,0.3)", fontSize: 15, fontWeight: 600, padding: 32, textAlign: "center" }}>
                <span style={{ fontSize: 52 }}>🖼️</span>
                Result will appear here
                <span style={{ fontSize: 12, fontWeight: 400, maxWidth: 280, lineHeight: 1.7 }}>
                  1. Upload an image<br />
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
        <p>© 2026 iNeedTools · Image Size Adjuster</p>
      </footer>
    </div>
  );
}
