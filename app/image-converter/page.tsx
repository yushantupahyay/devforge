"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

type OutputFmt = "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/bmp";
type ToolState = "idle" | "processing" | "done" | "error";

const FORMATS: { label: string; mime: OutputFmt; ext: string; color: string }[] = [
  { label: "JPEG", mime: "image/jpeg", ext: "jpg",  color: "#e11d48" },
  { label: "PNG",  mime: "image/png",  ext: "png",  color: "#7c3aed" },
  { label: "WebP", mime: "image/webp", ext: "webp", color: "#0891b2" },
  { label: "BMP",  mime: "image/bmp",  ext: "bmp",  color: "#d97706" },
];

const QUALITY_FORMATS = new Set<OutputFmt>(["image/jpeg", "image/webp"]);

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

interface ConvertResult {
  blob: Blob;
  width: number;
  height: number;
  mime: OutputFmt;
  ext: string;
}

async function convertImage(file: File, mime: OutputFmt, quality: number): Promise<ConvertResult> {
  const img    = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  // white background for JPEG/BMP which don't support transparency
  if (mime === "image/jpeg" || mime === "image/bmp") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);
  const blob = await encodeCanvas(canvas, mime, quality / 100);
  const ext  = FORMATS.find(f => f.mime === mime)!.ext;
  return { blob, width: canvas.width, height: canvas.height, mime, ext };
}

interface FileItem {
  file: File;
  id: string;
  state: ToolState;
  result?: ConvertResult;
  error?: string;
  preview: string;
}

export default function ImageConverter() {
  const [items,   setItems]   = useState<FileItem[]>([]);
  const [outFmt,  setOutFmt]  = useState<OutputFmt>("image/png");
  const [quality, setQuality] = useState(92);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!valid.length) return;
    setItems(prev => [
      ...prev,
      ...valid.map(f => ({
        file:    f,
        id:      `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        state:   "idle" as ToolState,
        preview: URL.createObjectURL(f),
      })),
    ]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const convertAll = async () => {
    const pending = items.filter(i => i.state === "idle" || i.state === "error");
    if (!pending.length) return;

    for (const item of pending) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, state: "processing" } : i));
      try {
        const result = await convertImage(item.file, outFmt, quality);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, state: "done", result } : i));
      } catch (err) {
        setItems(prev => prev.map(i => i.id === item.id ? {
          ...i, state: "error", error: err instanceof Error ? err.message : "Conversion failed",
        } : i));
      }
    }
  };

  const downloadOne = (item: FileItem) => {
    if (!item.result) return;
    const a   = document.createElement("a");
    a.href    = URL.createObjectURL(item.result.blob);
    const base = item.file.name.replace(/\.[^.]+$/, "");
    a.download = `${base}.${item.result.ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadAll = () => {
    items.filter(i => i.state === "done").forEach(downloadOne);
  };

  const clearAll = () => {
    items.forEach(i => { if (i.preview) URL.revokeObjectURL(i.preview); });
    setItems([]);
  };

  const doneCount    = items.filter(i => i.state === "done").length;
  const pendingCount = items.filter(i => i.state === "idle" || i.state === "error").length;
  const showQuality  = QUALITY_FORMATS.has(outFmt);
  const activeFmt    = FORMATS.find(f => f.mime === outFmt)!;

  return (
    <div style={{ background: "#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">

        {/* header */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ fontSize: 13, color: "#7c3aed", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 16 }}>
            ← Back to iNeedTools
          </Link>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#0f0a1e", margin: 0, letterSpacing: -0.5 }}>
            Image Format Converter
          </h1>
          <p style={{ fontSize: 15, color: "rgba(15,10,30,0.55)", marginTop: 6 }}>
            Convert JPG, PNG, WebP, BMP — bulk convert multiple images at once, right in your browser.
          </p>
        </div>

        {/* settings row */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start",
          marginBottom: 24, padding: "20px 22px",
          borderRadius: 18, background: "linear-gradient(135deg,#f5f3ff,#f0f4ff)",
          border: "1px solid rgba(124,58,237,.14)",
          boxShadow: "0 4px 24px rgba(124,58,237,.07)",
        }}>

          {/* output format */}
          <div style={{ flex: "1 1 220px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(15,10,30,.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Convert To
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FORMATS.map(f => {
                const active = outFmt === f.mime;
                return (
                  <button
                    key={f.mime}
                    onClick={() => { setOutFmt(f.mime); setItems(prev => prev.map(i => ({ ...i, state: i.state === "done" ? "idle" : i.state, result: undefined }))); }}
                    style={{
                      padding: "7px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      border: active ? `2px solid ${f.color}` : "2px solid rgba(15,10,30,.1)",
                      background: active ? `${f.color}14` : "#fff",
                      color: active ? f.color : "rgba(15,10,30,.55)",
                      transition: "all .15s",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* quality (only for lossy formats) */}
          {showQuality && (
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(15,10,30,.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Quality — <span style={{ color: activeFmt.color }}>{quality}%</span>
              </div>
              <input
                type="range" min={10} max={100} step={1} value={quality}
                onChange={e => { setQuality(Number(e.target.value)); setItems(prev => prev.map(i => ({ ...i, state: i.state === "done" ? "idle" : i.state, result: undefined }))); }}
                style={{ width: "100%", accentColor: activeFmt.color, cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(15,10,30,.35)", marginTop: 3 }}>
                <span>Smaller file</span><span>Higher quality</span>
              </div>
            </div>
          )}

          {/* actions */}
          {items.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", paddingBottom: 2, flexWrap: "wrap" }}>
              {pendingCount > 0 && (
                <button
                  onClick={convertAll}
                  style={{
                    padding: "9px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13,
                    background: `linear-gradient(135deg,${activeFmt.color},${activeFmt.color}cc)`,
                    color: "#fff", border: "none", cursor: "pointer",
                    boxShadow: `0 4px 14px ${activeFmt.color}44`,
                  }}
                >
                  Convert {pendingCount > 1 ? `All (${pendingCount})` : ""}
                </button>
              )}
              {doneCount > 1 && (
                <button
                  onClick={downloadAll}
                  style={{
                    padding: "9px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13,
                    background: "#f5f3ff", color: "#7c3aed",
                    border: "1px solid rgba(124,58,237,.25)", cursor: "pointer",
                  }}
                >
                  Download All ({doneCount})
                </button>
              )}
              <button
                onClick={clearAll}
                style={{
                  padding: "9px 14px", borderRadius: 12, fontWeight: 600, fontSize: 13,
                  background: "rgba(15,10,30,.04)", color: "rgba(15,10,30,.45)",
                  border: "1px solid rgba(15,10,30,.1)", cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? activeFmt.color : "rgba(124,58,237,.28)"}`,
            borderRadius: 20, padding: "38px 24px", textAlign: "center",
            cursor: "pointer", transition: "all .2s",
            background: dragging ? `${activeFmt.color}07` : "rgba(124,58,237,.025)",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>🖼️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f0a1e", marginBottom: 5 }}>
            Drop images here or click to browse
          </div>
          <div style={{ fontSize: 13, color: "rgba(15,10,30,.45)" }}>
            Supports JPG, PNG, WebP, GIF, BMP, AVIF — multiple files OK
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={e => addFiles(e.target.files)}
          />
        </div>

        {/* file list */}
        {items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map(item => (
              <div
                key={item.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 16,
                  background: item.state === "done" ? "rgba(5,150,105,.04)" : item.state === "error" ? "rgba(225,29,72,.04)" : "#fff",
                  border: item.state === "done"
                    ? "1px solid rgba(5,150,105,.18)"
                    : item.state === "error"
                    ? "1px solid rgba(225,29,72,.18)"
                    : "1px solid rgba(15,10,30,.09)",
                  boxShadow: "0 2px 8px rgba(15,10,30,.04)",
                }}
              >
                {/* thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt={item.file.name}
                  style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 10, flexShrink: 0, border: "1px solid rgba(15,10,30,.08)" }}
                />

                {/* info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f0a1e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.file.name}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(15,10,30,.45)", marginTop: 2 }}>
                    {fmtBytes(item.file.size)}
                    {item.result && (
                      <> → <span style={{ color: activeFmt.color, fontWeight: 700 }}>{fmtBytes(item.result.blob.size)}</span>
                      {" "}·{" "}{item.result.width}×{item.result.height}px</>
                    )}
                    {item.error && <span style={{ color: "#e11d48" }}> — {item.error}</span>}
                  </div>
                </div>

                {/* status badge */}
                <div style={{ flexShrink: 0 }}>
                  {item.state === "processing" && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", background: "rgba(124,58,237,.08)", padding: "4px 10px", borderRadius: 8 }}>
                      Converting…
                    </span>
                  )}
                  {item.state === "done" && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", background: "rgba(5,150,105,.1)", padding: "4px 10px", borderRadius: 8 }}>
                      ✓ Done
                    </span>
                  )}
                  {item.state === "error" && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#e11d48", background: "rgba(225,29,72,.08)", padding: "4px 10px", borderRadius: 8 }}>
                      ✕ Error
                    </span>
                  )}
                </div>

                {/* action buttons */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {(item.state === "idle" || item.state === "error") && (
                    <button
                      onClick={async () => {
                        setItems(prev => prev.map(i => i.id === item.id ? { ...i, state: "processing" } : i));
                        try {
                          const result = await convertImage(item.file, outFmt, quality);
                          setItems(prev => prev.map(i => i.id === item.id ? { ...i, state: "done", result } : i));
                        } catch (err) {
                          setItems(prev => prev.map(i => i.id === item.id ? {
                            ...i, state: "error", error: err instanceof Error ? err.message : "Conversion failed",
                          } : i));
                        }
                      }}
                      style={{
                        padding: "6px 13px", borderRadius: 10, fontWeight: 700, fontSize: 12,
                        background: `${activeFmt.color}14`, color: activeFmt.color,
                        border: `1px solid ${activeFmt.color}33`, cursor: "pointer",
                      }}
                    >
                      Convert
                    </button>
                  )}
                  {item.state === "done" && (
                    <button
                      onClick={() => downloadOne(item)}
                      style={{
                        padding: "6px 13px", borderRadius: 10, fontWeight: 700, fontSize: 12,
                        background: "rgba(5,150,105,.1)", color: "#059669",
                        border: "1px solid rgba(5,150,105,.2)", cursor: "pointer",
                      }}
                    >
                      ↓ Download
                    </button>
                  )}
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      padding: "6px 10px", borderRadius: 10, fontWeight: 700, fontSize: 12,
                      background: "rgba(15,10,30,.04)", color: "rgba(15,10,30,.35)",
                      border: "1px solid rgba(15,10,30,.09)", cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* format info cards */}
        <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
          {[
            { fmt: "JPEG", icon: "📷", desc: "Best for photos. Lossy compression, small file size. No transparency.", color: "#e11d48" },
            { fmt: "PNG",  icon: "🖼️", desc: "Lossless quality. Supports transparency (alpha channel). Larger files.", color: "#7c3aed" },
            { fmt: "WebP", icon: "⚡", desc: "Modern format. Up to 30% smaller than JPEG. Supports transparency.", color: "#0891b2" },
            { fmt: "BMP",  icon: "🗂️", desc: "Uncompressed bitmap. Maximum quality, very large files.", color: "#d97706" },
          ].map(c => (
            <div
              key={c.fmt}
              style={{
                padding: "14px 16px", borderRadius: 14,
                background: "#fff", border: "1px solid rgba(15,10,30,.08)",
                boxShadow: "0 2px 8px rgba(15,10,30,.04)",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: c.color, marginBottom: 4 }}>{c.fmt}</div>
              <div style={{ fontSize: 12, color: "rgba(15,10,30,.5)", lineHeight: 1.5 }}>{c.desc}</div>
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid rgba(15,10,30,.07)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <Link href="/" style={{ fontSize: 12, color: "rgba(15,10,30,.4)", textDecoration: "none", fontWeight: 600 }}>
            ← Back to iNeedTools
          </Link>
          <span style={{ fontSize: 12, color: "rgba(15,10,30,.3)" }}>© 2026 iNeedTools · Image Format Converter</span>
        </div>

      </main>
    </div>
  );
}
