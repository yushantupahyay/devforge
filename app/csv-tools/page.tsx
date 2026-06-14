"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

const SAMPLE_CSV = `id,name,role,salary,active,city
1,Alice Johnson,Engineer,95000,true,New York
2,Bob Smith,Designer,78000,true,Austin
3,Carol White,Manager,120000,false,Seattle
4,Dave Brown,Engineer,88000,true,Chicago
5,Eve Davis,Analyst,72000,true,Denver`;

const SAMPLE_JSON = `[
  {"id":1,"name":"Alice","role":"Engineer","salary":95000},
  {"id":2,"name":"Bob","role":"Designer","salary":78000},
  {"id":3,"name":"Carol","role":"Manager","salary":120000}
]`;

type Mode = "viewer" | "csv2json" | "json2csv";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let field = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i+1] === '"') { field += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        fields.push(field.trim()); field = "";
      } else field += ch;
    }
    fields.push(field.trim());
    rows.push(fields);
  }
  return rows;
}

function csvToJson(csv: string): string {
  const rows = parseCSV(csv);
  if (rows.length < 2) throw new Error("Need at least a header row + one data row");
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const v = row[i] ?? "";
      if (v === "true") obj[h] = true;
      else if (v === "false") obj[h] = false;
      else if (v !== "" && !isNaN(Number(v))) obj[h] = Number(v);
      else obj[h] = v;
    });
    return obj;
  });
  return JSON.stringify(data, null, 2);
}

function jsonToCsv(json: string): string {
  const data = JSON.parse(json);
  if (!Array.isArray(data) || data.length === 0) throw new Error("Input must be a non-empty JSON array");
  const headers = Array.from(new Set(data.flatMap(r => Object.keys(r as object))));
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(","), ...data.map((row: Record<string,unknown>) => headers.map(h => esc(row[h])).join(","))];
  return lines.join("\n");
}

export default function CsvTools() {
  const [mode, setMode] = useState<Mode>("viewer");
  const [input, setInput] = useState(SAMPLE_CSV);
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /**/ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const { rows, error: parseErr } = useMemo(() => {
    try { return { rows: parseCSV(input), error: "" }; }
    catch (e) { return { rows: [] as string[][], error: String(e) }; }
  }, [input]);

  const { output, error: convErr } = useMemo(() => {
    if (!input.trim()) return { output: "", error: "" };
    try {
      if (mode === "csv2json") return { output: csvToJson(input), error: "" };
      if (mode === "json2csv") return { output: jsonToCsv(input), error: "" };
    } catch (e) { return { output: "", error: String(e).replace(/^Error: /, "") }; }
    return { output: "", error: "" };
  }, [input, mode]);

  const MODES: { key: Mode; label: string; color: string }[] = [
    { key:"viewer",   label:"⊞ CSV Viewer",   color:"#0891b2" },
    { key:"csv2json", label:"CSV → JSON",      color:"#7c3aed" },
    { key:"json2csv", label:"JSON → CSV",      color:"#059669" },
  ];

  const sample = mode === "json2csv" ? SAMPLE_JSON : SAMPLE_CSV;
  const placeholder = mode === "json2csv" ? 'Paste a JSON array here…' : 'Paste CSV data here…';

  const thS: React.CSSProperties = { padding:"10px 16px", textAlign:"left", fontWeight:700, fontSize:11, letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(15,10,30,0.45)", borderBottom:"1px solid rgba(8,145,178,0.14)", whiteSpace:"nowrap" };

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#ecfeff,#cffafe 30%,#fff)", padding:"36px 40px 28px" }}>
        <p className="section-label mb-2" style={{ color:"#0891b2" }}>Data Tool</p>
        <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#0891b2,#0e7490)" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(26px,3.5vw,48px)", color:"#0f0a1e" }}>
          CSV <span style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Tools</span>
        </h1>
        <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15, maxWidth:580 }}>
          View CSV as a table, convert CSV to JSON, or convert a JSON array back to CSV — all in your browser.
        </p>
      </section>

      <div style={{ width:"100%", padding:"18px 40px 48px", flex:1, boxSizing:"border-box" }}>

        {/* mode tabs */}
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
          {MODES.map(m => (
            <button key={m.key} onClick={() => { setMode(m.key); setInput(m.key === "json2csv" ? SAMPLE_JSON : SAMPLE_CSV); }} style={{ padding:"8px 20px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.15s", background:mode===m.key?m.color:"rgba(0,0,0,0.04)", color:mode===m.key?"#fff":"rgba(15,10,30,0.55)", border:mode===m.key?`1px solid ${m.color}`:"1px solid rgba(0,0,0,0.09)", boxShadow:mode===m.key?`0 4px 14px ${m.color}33`:"none" }}>
              {m.label}
            </button>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button onClick={() => setInput(sample)} style={{ padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:600, cursor:"pointer", background:"rgba(8,145,178,0.07)", color:"#0891b2", border:"1px solid rgba(8,145,178,0.18)" }}>Sample</button>
            <button onClick={() => setInput("")} style={{ padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:600, cursor:"pointer", background:"rgba(225,29,72,0.06)", color:"#e11d48", border:"1px solid rgba(225,29,72,0.15)" }}>Clear</button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, alignItems:"start" }}>
          {/* left: input */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>
              {mode === "json2csv" ? "Input JSON Array" : "Input CSV"}
            </label>
            <textarea className="field field-mono" value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder} style={{ minHeight:440, borderRadius:14, fontSize:12.5, resize:"vertical", width:"100%" }} />
            {mode === "viewer" && rows.length > 0 && !parseErr && (
              <div style={{ marginTop:8, display:"flex", gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, padding:"5px 11px", borderRadius:7, background:"rgba(8,145,178,0.07)", border:"1px solid rgba(8,145,178,0.12)", color:"#0891b2" }}>{rows.length - 1} rows</span>
                <span style={{ fontSize:11, fontWeight:700, padding:"5px 11px", borderRadius:7, background:"rgba(124,58,237,0.07)", border:"1px solid rgba(124,58,237,0.12)", color:"#7c3aed" }}>{rows[0]?.length ?? 0} columns</span>
              </div>
            )}
          </div>

          {/* right: output */}
          <div>
            {mode === "viewer" ? (
              input.trim() && rows.length > 0 ? (
                <div style={{ overflowX:"auto", borderRadius:16, border:"1px solid rgba(8,145,178,0.18)" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead>
                      <tr style={{ background:"rgba(236,254,255,0.98)" }}>
                        <th style={{ ...thS, textAlign:"center", width:44, color:"rgba(15,10,30,0.3)" }}>#</th>
                        {rows[0].map((h, i) => <th key={i} style={thS}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(1).map((row, i) => (
                        <tr key={i} style={{ borderBottom:"1px solid rgba(0,0,0,0.04)", background:i%2===0?"#fff":"rgba(8,145,178,0.018)" }}>
                          <td style={{ padding:"9px 14px", textAlign:"center", color:"rgba(15,10,30,0.25)", fontWeight:600, fontSize:11 }}>{i+1}</td>
                          {rows[0].map((_, j) => (
                            <td key={j} style={{ padding:"9px 16px", fontSize:13, color:"#0f0a1e" }}>{row[j] ?? ""}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding:"7px 16px", borderTop:"1px solid rgba(8,145,178,0.1)", fontSize:11, color:"rgba(15,10,30,0.35)", fontWeight:600 }}>
                    {rows.length - 1} rows · {rows[0]?.length ?? 0} columns
                  </div>
                </div>
              ) : (
                <div style={{ background:"#f0fdfe", border:"1px dashed rgba(8,145,178,0.2)", borderRadius:16, minHeight:440, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"rgba(15,10,30,0.3)", fontSize:14, fontWeight:600 }}>
                  <span style={{ fontSize:40 }}>⊞</span>
                  Paste CSV on the left
                </div>
              )
            ) : (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase" }}>
                    {mode === "csv2json" ? "JSON Output" : "CSV Output"}
                  </label>
                  {output && (
                    <button onClick={() => copy(output)} style={{ fontSize:11, fontWeight:600, color:copied?"#059669":"#7c3aed", background:copied?"rgba(5,150,105,0.07)":"rgba(124,58,237,0.07)", border:`1px solid ${copied?"rgba(5,150,105,0.2)":"rgba(124,58,237,0.14)"}`, borderRadius:7, padding:"4px 12px", cursor:"pointer" }}>
                      {copied?"✓ Copied!":"Copy"}
                    </button>
                  )}
                </div>
                {convErr ? (
                  <div style={{ padding:"16px 20px", borderRadius:14, background:"rgba(225,29,72,0.05)", border:"1px solid rgba(225,29,72,0.18)", fontSize:12, color:"#e11d48", fontFamily:"monospace" }}>✕ {convErr}</div>
                ) : output ? (
                  <div style={{ background:"#0f172a", borderRadius:14, padding:"20px 22px", minHeight:440, overflowX:"auto", lineHeight:1.9, fontSize:12.5, fontFamily:"monospace", whiteSpace:"pre", color:"#e2e8f0" }}>{output}</div>
                ) : (
                  <div style={{ background:"#f8fafc", border:"1px dashed rgba(0,0,0,0.12)", borderRadius:14, minHeight:440, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(15,10,30,0.3)", fontSize:13 }}>
                    Output will appear here
                  </div>
                )}
                {output && <div style={{ marginTop:6, textAlign:"right", fontSize:11, color:"rgba(15,10,30,0.35)" }}>{output.length.toLocaleString()} chars</div>}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#0891b2", textDecoration:"none" }}>← Back to DevForge</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(8,145,178,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 DevForge · CSV Tools</p>
      </footer>
    </div>
  );
}
