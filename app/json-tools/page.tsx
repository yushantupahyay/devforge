"use client";

import { useState, useMemo, useCallback, Fragment, useRef, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

type ViewMode = "grid" | "format" | "minify" | "validate";

const SAMPLE_ARRAY = `[
  { "id": 1, "name": "Alice Johnson", "role": "Engineer",  "salary": 95000, "active": true,  "dept": "Engineering", "address": { "city": "New York", "zip": "10001" }, "skills": ["React","Node","SQL"] },
  { "id": 2, "name": "Bob Smith",     "role": "Designer",  "salary": 78000, "active": true,  "dept": "Design",      "address": { "city": "Austin",   "zip": "78701" }, "skills": ["Figma","CSS"]       },
  { "id": 3, "name": "Carol White",   "role": "Manager",   "salary": 120000,"active": false, "dept": "Engineering", "address": { "city": "Seattle",  "zip": "98101" }, "skills": ["Leadership","SQL"]  }
]`;

const SAMPLE_NESTED = `{
  "id": 101,
  "status": "active",
  "user_profile": {
    "first_name": "Alex",
    "last_name": "Smith",
    "contact": {
      "email": "alex@example.com",
      "phone": "555-0199"
    }
  },
  "preferences": [
    { "type": "notification", "enabled": true },
    { "type": "dark_mode",    "enabled": false }
  ]
}`;

/* ── helpers ─────────────────────────────────────────── */
function escHtml(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function highlight(json: string) {
  return escHtml(json).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    m => {
      let c = "color:#fb923c";
      if (/^"/.test(m)) c = /:$/.test(m) ? "color:#f472b6" : "color:#86efac";
      else if (/true|false/.test(m)) c = "color:#60a5fa";
      else if (/null/.test(m)) c = "color:#94a3b8";
      return `<span style="${c}">${m}</span>`;
    }
  );
}
function countKeys(o: unknown): number {
  if (typeof o !== "object" || o === null) return 0;
  return Object.keys(o as object).length + Object.values(o as object).reduce<number>((s,v) => s + countKeys(v), 0);
}
function countDepth(o: unknown, d = 0): number {
  if (typeof o !== "object" || o === null) return d;
  const vals = Object.values(o as object);
  return vals.length ? Math.max(...vals.map(v => countDepth(v, d + 1))) : d;
}

const isArrOfObj = (v: unknown): v is Record<string,unknown>[] =>
  Array.isArray(v) && v.length > 0 &&
  typeof v[0] === "object" && v[0] !== null && !Array.isArray(v[0]);

/* ── Cell: renders a single primitive value ─────────── */
function Cell({ value }: { value: unknown }) {
  if (value === null || value === undefined)
    return <span style={{ color:"#94a3b8", fontStyle:"italic", fontSize:12 }}>null</span>;
  if (typeof value === "boolean")
    return <span style={{ background:"rgba(59,130,246,0.1)", color:"#2563eb", padding:"1px 7px", borderRadius:4, fontSize:12, fontWeight:700 }}>{String(value)}</span>;
  if (typeof value === "number")
    return <span style={{ background:"rgba(249,115,22,0.1)", color:"#ea580c", padding:"1px 7px", borderRadius:4, fontSize:12, fontWeight:700 }}>{String(value)}</span>;
  return <span style={{ color:"#0f0a1e", fontSize:13 }}>{String(value)}</span>;
}

/* ── sub-table for array-of-objects ─────────────────── */
function ArrOfObjTable({ arr, noMargin }: { arr: Record<string,unknown>[]; noMargin?: boolean }) {
  const cols = Array.from(new Set(arr.flatMap(r => Object.keys(r))));
  const th: React.CSSProperties = { padding:"7px 14px", textAlign:"left", fontWeight:700, fontSize:10, letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(15,10,30,0.45)", borderBottom:"1px solid rgba(124,58,237,0.12)", whiteSpace:"nowrap" };
  return (
    <div style={{ margin: noMargin ? "0" : "6px 0 6px 28px", borderRadius:10, overflow:"hidden", border:"1px solid rgba(124,58,237,0.18)" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
        <thead>
          <tr style={{ background:"rgba(124,58,237,0.07)" }}>
            <th style={th}>#</th>
            {cols.map(c => <th key={c} style={th}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {arr.map((row, i) => (
            <tr key={i} style={{ borderBottom:"1px solid rgba(0,0,0,0.04)", background: i%2===0?"#fff":"rgba(124,58,237,0.03)" }}>
              <td style={{ padding:"7px 14px", color:"rgba(15,10,30,0.3)", fontWeight:700 }}>{i+1}</td>
              {cols.map(c => <td key={c} style={{ padding:"7px 14px" }}><ExpandableCell value={row[c]} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── ExpandableCell: cell that can expand nested data ─ */
function ExpandableCell({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState(false);

  /* primitives — plain render */
  if (typeof value !== "object" || value === null) return <Cell value={value} />;

  const valIsArr = Array.isArray(value);

  /* empty */
  if (valIsArr && (value as unknown[]).length === 0)
    return <span style={{ color:"#94a3b8", fontSize:12 }}>[ ]</span>;
  if (!valIsArr && Object.keys(value as object).length === 0)
    return <span style={{ color:"#94a3b8", fontSize:12 }}>{"{}"}</span>;

  /* plain array of primitives — no expand needed */
  if (valIsArr && (value as unknown[]).every(v => typeof v !== "object" || v === null))
    return <span style={{ color:"#0891b2", fontSize:12 }}>{(value as unknown[]).map(v => String(v ?? "null")).join(", ")}</span>;

  const size = valIsArr ? (value as unknown[]).length : Object.keys(value as object).length;
  const label = valIsArr
    ? `[ ${size} item${size !== 1 ? "s" : ""} ]`
    : `{ ${size} key${size !== 1 ? "s" : ""} }`;

  return (
    <div>
      {/* clickable chip — the + / − is part of the chip */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display:"inline-flex", alignItems:"center", gap:5,
          fontSize:11, fontWeight:700, cursor:"pointer",
          background: expanded ? "rgba(124,58,237,0.18)" : "rgba(124,58,237,0.08)",
          color:"#7c3aed", border:"1px solid rgba(124,58,237,0.28)",
          borderRadius:6, padding:"3px 9px", lineHeight:1.4,
        }}
      >
        <span style={{ fontWeight:900, fontSize:13, lineHeight:1 }}>{expanded ? "−" : "+"}</span>
        {label}
      </button>

      {/* expanded content — inline below the chip */}
      {expanded && (
        <div style={{ marginTop:8 }}>
          {isArrOfObj(value) ? (
            <ArrOfObjTable arr={value as Record<string,unknown>[]} noMargin />
          ) : valIsArr ? (
            <div style={{ fontFamily:"monospace", fontSize:12, background:"rgba(0,0,0,0.03)", borderRadius:8, padding:"8px 12px", border:"1px solid rgba(0,0,0,0.06)" }}>
              {(value as unknown[]).map((item, idx) => (
                <div key={idx} style={{ padding:"3px 0", borderBottom: idx < (value as unknown[]).length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                  <span style={{ color:"rgba(15,10,30,0.3)", marginRight:6 }}>{idx + 1}.</span>
                  <span style={{ color: typeof item === "object" ? "#7c3aed" : "#0f0a1e" }}>
                    {typeof item === "object" ? JSON.stringify(item) : String(item ?? "null")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <TreeExplorer data={value} />
          )}
        </div>
      )}
    </div>
  );
}

/* ── TreeBody: recursive rows ───────────────────────── */
interface TBProps {
  data: unknown; path: string; depth: number;
  expanded: Set<string>; toggle: (p: string) => void;
}
function TreeBody({ data, path, depth, expanded, toggle }: TBProps) {
  if (typeof data !== "object" || data === null) return null;
  const isArr = Array.isArray(data);
  const entries: [string, unknown][] = isArr
    ? (data as unknown[]).map((v, i) => [String(i+1), v])
    : Object.entries(data as Record<string,unknown>);

  return (
    <>
      {entries.map(([key, val], idx) => {
        const fp = path ? `${path}.${key}` : key;
        const isObj = typeof val === "object" && val !== null;
        const isExp = expanded.has(fp);
        const isArrVal = Array.isArray(val);
        const isAOO = isArrVal && isArrOfObj(val);
        const size = isObj ? (isArrVal ? (val as unknown[]).length : Object.keys(val as object).length) : 0;
        const bg = idx%2===0 ? "#ffffff" : "rgba(124,58,237,0.016)";
        return (
          <Fragment key={fp}>
            <tr style={{ borderBottom:"1px solid rgba(0,0,0,0.04)", background:bg }}>
              <td style={{ padding:"9px 14px 9px " + (14 + depth*22) + "px", verticalAlign:"middle", minWidth:160 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  {isObj ? (
                    <button onClick={() => toggle(fp)} style={{ fontSize:11, fontWeight:900, width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, borderRadius:4, border:"1px solid rgba(124,58,237,0.28)", background:isExp?"rgba(124,58,237,0.18)":"rgba(124,58,237,0.07)", color:"#7c3aed", cursor:"pointer", lineHeight:1 }}>
                      {isExp ? "−" : "+"}
                    </button>
                  ) : <span style={{ width:20, flexShrink:0 }} />}
                  <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:depth===0?700:500, color:depth===0?"#5b21b6":"rgba(15,10,30,0.65)" }}>
                    {key}
                  </span>
                </div>
              </td>
              <td style={{ padding:"9px 14px", verticalAlign:"middle" }}>
                {isObj ? (
                  <span style={{ fontSize:11, color:"rgba(15,10,30,0.38)", fontFamily:"monospace" }}>
                    {isArrVal ? `[ ${size} item${size!==1?"s":""} ]` : `{ ${size} key${size!==1?"s":""} }`}
                  </span>
                ) : <Cell value={val} />}
              </td>
            </tr>
            {isExp && isObj && (
              isAOO ? (
                <tr style={{ background:"rgba(124,58,237,0.015)" }}>
                  <td colSpan={2} style={{ padding:0, paddingLeft:(depth+1)*22 }}>
                    <ArrOfObjTable arr={val as Record<string,unknown>[]} />
                  </td>
                </tr>
              ) : (
                <TreeBody data={val} path={fp} depth={depth+1} expanded={expanded} toggle={toggle} />
              )
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/* ── TreeExplorer: full wrapper ─────────────────────── */
function TreeExplorer({ data }: { data: unknown }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = useCallback((p: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  }, []);
  const thS: React.CSSProperties = { padding:"11px 16px", textAlign:"left", fontWeight:700, fontSize:11, letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(15,10,30,0.45)", borderBottom:"1px solid rgba(124,58,237,0.14)", whiteSpace:"nowrap" };
  return (
    <div style={{ overflowX:"auto", borderRadius:16, border:"1px solid rgba(124,58,237,0.14)" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr style={{ background:"rgba(248,245,255,0.98)" }}>
            <th style={{ ...thS, color:"#7c3aed", minWidth:180 }}>Key</th>
            <th style={thS}>Value</th>
          </tr>
        </thead>
        <tbody>
          <TreeBody data={data} path="" depth={0} expanded={expanded} toggle={toggle} />
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function JsonToolsPage() {
  const [input, setInput]       = useState(SAMPLE_ARRAY);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortCol, setSortCol]   = useState<string | null>(null);
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("asc");
  const [filter, setFilter]     = useState("");
  const [copied, setCopied]     = useState(false);
  const [splitPct, setSplitPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef  = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);

  /* auto-resize textarea to fit content */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(200, el.scrollHeight) + "px";
  }, [input]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(78, Math.max(22, pct)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  const { parsed, error } = useMemo(() => {
    if (!input.trim()) return { parsed: null, error: "" };
    try { return { parsed: JSON.parse(input), error: "" }; }
    catch (e) { return { parsed: null, error: String(e).replace("SyntaxError: ","") }; }
  }, [input]);

  const isArr = Array.isArray(parsed);

  /* root is an array of objects → use flat grid; otherwise → use tree explorer */
  const rootIsGrid = isArr && isArrOfObj(parsed);

  const cols = useMemo(() => {
    if (!rootIsGrid) return [] as string[];
    return Array.from(new Set((parsed as Record<string,unknown>[]).flatMap(r => Object.keys(r))));
  }, [rootIsGrid, parsed]);

  const rows = useMemo(() => {
    if (!rootIsGrid) return [] as Record<string,unknown>[];
    let r = parsed as Record<string,unknown>[];
    if (filter) {
      const q = filter.toLowerCase();
      r = r.filter(row => Object.values(row).some(v => {
        const s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
        return s.toLowerCase().includes(q);
      }));
    }
    if (sortCol) {
      r = [...r].sort((a, b) => {
        const av = a[sortCol] ?? "", bv = b[sortCol] ?? "";
        const an = Number(av), bn = Number(bv);
        const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return r;
  }, [rootIsGrid, parsed, filter, sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol === col) { if (sortDir === "asc") setSortDir("desc"); else { setSortCol(null); setSortDir("asc"); } }
    else { setSortCol(col); setSortDir("asc"); }
  };

  /* auto-format valid JSON when pasted */
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    try {
      const obj = JSON.parse(text);
      e.preventDefault();
      setInput(JSON.stringify(obj, null, 2));
      setSortCol(null);
      setFilter("");
    } catch {
      /* not valid JSON — let default paste proceed */
    }
  }, []);

  const formatInput = useCallback(() => {
    if (!parsed) return;
    setInput(JSON.stringify(parsed, null, 2));
  }, [parsed]);

  const codeOutput = useMemo(() => {
    if (!parsed) return "";
    if (viewMode === "format")   return JSON.stringify(parsed, null, 2);
    if (viewMode === "minify")   return JSON.stringify(parsed);
    if (viewMode === "validate") return `✓  Valid JSON\n\nType    : ${isArr ? `Array[${(parsed as unknown[]).length}]` : "Object"}\nKeys    : ${countKeys(parsed)} (all levels)\nDepth   : ${countDepth(parsed)} level(s)\nChars   : ${input.length.toLocaleString()}\nMinified: ${JSON.stringify(parsed).length.toLocaleString()} chars`;
    return "";
  }, [parsed, viewMode, isArr, input]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /**/ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const VIEWS: { key: ViewMode; label: string; color: string }[] = [
    { key:"grid",     label:"⊞ Grid View",  color:"#7c3aed" },
    { key:"format",   label:"Format JSON",  color:"#0891b2" },
    { key:"minify",   label:"Minify",       color:"#d97706" },
    { key:"validate", label:"Validate",     color:"#059669" },
  ];

  const thS: React.CSSProperties = {
    padding:"11px 16px", textAlign:"left", fontWeight:700, fontSize:11,
    letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(15,10,30,0.45)",
    borderBottom:"1px solid rgba(124,58,237,0.14)", whiteSpace:"nowrap",
  };

  const statusText = error
    ? `✕ ${error}`
    : parsed
      ? `✓ Valid — ${isArr ? `Array[${(parsed as unknown[]).length}]` : "Object"}${rootIsGrid ? ` — ${cols.length} cols` : ""}`
      : "No input";

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ background:"linear-gradient(135deg,#f5f3ff,#f0f4ff 50%,#fff)", padding:"36px 40px 28px" }}>
        <p className="section-label mb-2">Data Tool</p>
        <div className="section-line" style={{ margin:"0 0 12px" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(26px,3.5vw,48px)", color:"#0f0a1e" }}>
          JSON <span className="text-gradient-purple">Reader</span>
        </h1>
        <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15, maxWidth:620 }}>
          Paste any JSON — flat arrays, single objects, or deeply nested structures — and get an interactive grid or tree explorer instantly.
        </p>
      </section>

      {/* ── Tool ─────────────────────────────────────────── */}
      <div style={{ width:"100%", padding:"18px 40px 48px", flex:1, boxSizing:"border-box" }}>

        {/* mode bar */}
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)} style={{ padding:"8px 20px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.15s", background:viewMode===v.key?v.color:"rgba(0,0,0,0.04)", color:viewMode===v.key?"#fff":"rgba(15,10,30,0.55)", border:viewMode===v.key?`1px solid ${v.color}`:"1px solid rgba(0,0,0,0.09)", boxShadow:viewMode===v.key?`0 4px 14px ${v.color}33`:"none" }}>
              {v.label}
            </button>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button onClick={() => { setInput(SAMPLE_NESTED); setSortCol(null); setFilter(""); }} style={{ padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:600, cursor:"pointer", background:"rgba(8,145,178,0.07)", color:"#0891b2", border:"1px solid rgba(8,145,178,0.18)" }}>
              Sample Object
            </button>
            <button onClick={() => { setInput(SAMPLE_ARRAY); setSortCol(null); setFilter(""); }} style={{ padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:600, cursor:"pointer", background:"rgba(124,58,237,0.07)", color:"#7c3aed", border:"1px solid rgba(124,58,237,0.18)" }}>
              Sample Array
            </button>
            <button onClick={() => { setInput(""); setSortCol(null); setFilter(""); }} style={{ padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:600, cursor:"pointer", background:"rgba(225,29,72,0.06)", color:"#e11d48", border:"1px solid rgba(225,29,72,0.15)" }}>
              Clear
            </button>
          </div>
        </div>

        {/* ── LEFT / RIGHT resizable two-panel ──────────── */}
        <div ref={containerRef} style={{ display:"flex", gap:0, alignItems:"start", userSelect: dragging ? "none" : "auto" }}>

          {/* ── LEFT: input ──── */}
          <div style={{ width:`${splitPct}%`, minWidth:220, flexShrink:0 }}>
            {/* label + format button */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase" }}>
                Input JSON
              </label>
              {parsed && (
                <button
                  onClick={formatInput}
                  style={{ fontSize:11, fontWeight:700, padding:"4px 11px", borderRadius:7, cursor:"pointer", background:"rgba(124,58,237,0.07)", color:"#7c3aed", border:"1px solid rgba(124,58,237,0.2)" }}
                >
                  ⌥ Format
                </button>
              )}
            </div>
            <textarea
              ref={textareaRef}
              className="field field-mono"
              value={input}
              onChange={e => { setInput(e.target.value); setSortCol(null); setFilter(""); }}
              onPaste={handlePaste}
              placeholder={"Paste any JSON here — it will auto-format on paste.\n\nExamples:\n• Array of objects  → sortable grid, nested cells expand inline\n• Single object     → tree explorer with + / − buttons\n• Deeply nested     → expand each level inline"}
              style={{ borderRadius:14, fontSize:12.5, resize:"none", width:"100%", minHeight:200, overflow:"hidden", boxSizing:"border-box" }}
            />

            {/* status */}
            <div style={{ marginTop:10, padding:"9px 14px", borderRadius:10, background:error?"rgba(225,29,72,0.06)":parsed?"rgba(5,150,105,0.06)":"rgba(0,0,0,0.03)", border:`1px solid ${error?"rgba(225,29,72,0.18)":parsed?"rgba(5,150,105,0.18)":"rgba(0,0,0,0.08)"}`, fontSize:12, color:error?"#e11d48":parsed?"#059669":"rgba(15,10,30,0.4)", fontFamily:"monospace", lineHeight:1.5 }}>
              {statusText}
            </div>

            {/* stats */}
            {parsed && rootIsGrid && (
              <div style={{ marginTop:8, display:"flex", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, fontWeight:700, padding:"5px 11px", borderRadius:7, background:"rgba(124,58,237,0.07)", border:"1px solid rgba(124,58,237,0.12)", color:"#7c3aed" }}>{rows.length}/{(parsed as unknown[]).length} rows</span>
                <span style={{ fontSize:11, fontWeight:700, padding:"5px 11px", borderRadius:7, background:"rgba(8,145,178,0.07)", border:"1px solid rgba(8,145,178,0.12)", color:"#0891b2" }}>{cols.length} cols</span>
              </div>
            )}
          </div>

          {/* ── DRAG HANDLE ─── */}
          <div
            onMouseDown={e => { e.preventDefault(); setDragging(true); }}
            style={{ width:22, flexShrink:0, cursor:"col-resize", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, padding:"12px 0", alignSelf:"stretch", minHeight:200 }}
          >
            <button onClick={() => setSplitPct(p => Math.max(22, p - 5))} title="Shift left" style={{ width:18, height:18, borderRadius:4, border:"1px solid rgba(124,58,237,0.25)", background:"rgba(124,58,237,0.07)", color:"#7c3aed", cursor:"pointer", fontSize:10, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", padding:0, lineHeight:1 }}>◀</button>
            <div style={{ display:"flex", flexDirection:"column", gap:3, alignItems:"center" }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ width: dragging ? 6 : 4, height:2, borderRadius:2, background: dragging ? "#7c3aed" : "rgba(124,58,237,0.3)", transition:"all 0.15s" }} />
              ))}
            </div>
            <span style={{ fontSize:9, fontWeight:700, color: dragging ? "#7c3aed" : "rgba(124,58,237,0.45)", fontFamily:"monospace", writingMode:"vertical-rl", letterSpacing:"0.05em" }}>
              {Math.round(splitPct)}%
            </span>
            <button onClick={() => setSplitPct(p => Math.min(78, p + 5))} title="Shift right" style={{ width:18, height:18, borderRadius:4, border:"1px solid rgba(124,58,237,0.25)", background:"rgba(124,58,237,0.07)", color:"#7c3aed", cursor:"pointer", fontSize:10, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", padding:0, lineHeight:1 }}>▶</button>
          </div>

          {/* ── RIGHT: output ─── */}
          <div style={{ flex:1, minWidth:200 }}>
            {viewMode === "grid" ? (
              <>
                {rootIsGrid ? (
                  <>
                    {/* filter bar */}
                    <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
                      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search / filter rows…" style={{ flex:1, minWidth:180, padding:"9px 14px", borderRadius:10, border:"1px solid rgba(124,58,237,0.18)", fontSize:13, background:"#fafbff", color:"#0f0a1e", outline:"none" }} />
                      {sortCol && (
                        <span style={{ fontSize:12, fontWeight:600, padding:"7px 14px", borderRadius:9, background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.15)", color:"#7c3aed", display:"flex", alignItems:"center", gap:6 }}>
                          Sort: {sortCol} {sortDir==="asc"?"↑":"↓"}
                          <button onClick={() => { setSortCol(null); setSortDir("asc"); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#e11d48", fontWeight:900, fontSize:15, lineHeight:1 }}>×</button>
                        </span>
                      )}
                    </div>
                    {/* flat grid table */}
                    <div style={{ overflowX:"auto", borderRadius:16, border:"1px solid rgba(124,58,237,0.14)" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                        <thead style={{ position:"sticky", top:0, zIndex:2 }}>
                          <tr style={{ background:"rgba(248,245,255,0.98)", backdropFilter:"blur(6px)" }}>
                            <th style={{ ...thS, textAlign:"center", width:48, color:"rgba(15,10,30,0.3)" }}>#</th>
                            {cols.map(c => (
                              <th key={c} onClick={() => handleSort(c)} style={{ ...thS, cursor:"pointer", userSelect:"none", color:sortCol===c?"#7c3aed":"rgba(15,10,30,0.5)", background:sortCol===c?"rgba(124,58,237,0.06)":"transparent" }}>
                                {c} {sortCol===c?(sortDir==="asc"?"↑":"↓"):<span style={{ opacity:0.25 }}>↕</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={i} style={{ borderBottom:"1px solid rgba(0,0,0,0.042)", background:i%2===0?"#ffffff":"rgba(124,58,237,0.016)" }}>
                              <td style={{ padding:"10px 14px", textAlign:"center", color:"rgba(15,10,30,0.25)", fontWeight:600, fontSize:11, verticalAlign:"top" }}>{i+1}</td>
                              {cols.map(c => (
                                <td key={c} style={{ padding:"10px 16px", verticalAlign:"top" }}>
                                  <ExpandableCell value={row[c]} />
                                </td>
                              ))}
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr><td colSpan={cols.length+1} style={{ padding:"40px", textAlign:"center", color:"rgba(15,10,30,0.3)", fontSize:14 }}>No rows match the filter</td></tr>
                          )}
                        </tbody>
                      </table>
                      <div style={{ padding:"8px 16px", borderTop:"1px solid rgba(124,58,237,0.08)", fontSize:11, color:"rgba(15,10,30,0.35)", fontWeight:600 }}>
                        {rows.length} of {(parsed as unknown[]).length} rows · {cols.length} columns · click <strong style={{ color:"#7c3aed" }}>+</strong> chips to expand nested values
                      </div>
                    </div>
                  </>
                ) : parsed !== null ? (
                  <TreeExplorer data={parsed} />
                ) : (
                  <div style={{ background:"#fafbff", border:"1px dashed rgba(124,58,237,0.18)", borderRadius:16, minHeight:460, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, color:"rgba(15,10,30,0.3)", fontSize:15, fontWeight:600 }}>
                    <span style={{ fontSize:48 }}>⊞</span>
                    Paste JSON on the left to see the grid
                    <span style={{ fontSize:12, fontWeight:400, maxWidth:300, textAlign:"center", lineHeight:1.6 }}>
                      Arrays of objects → sortable grid<br/>Single objects → tree explorer with expandable nodes
                    </span>
                  </div>
                )}
              </>
            ) : viewMode === "validate" ? (
              <div style={{ background:error?"rgba(225,29,72,0.04)":"#f0fdf4", border:`1px solid ${error?"rgba(225,29,72,0.2)":"rgba(5,150,105,0.22)"}`, borderRadius:16, padding:"28px 32px", fontFamily:"monospace", fontSize:13, lineHeight:2.1, color:error?"#b91c1c":"#065f46", minHeight:200, whiteSpace:"pre" }}>
                {error ? `✕ Invalid JSON\n\n${error}` : parsed ? codeOutput : "Paste JSON to validate"}
              </div>
            ) : (
              <div>
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:10 }}>
                  {codeOutput && (
                    <button onClick={() => copy(codeOutput)} style={{ fontSize:12, fontWeight:600, color:copied?"#059669":"#7c3aed", background:copied?"rgba(5,150,105,0.07)":"rgba(124,58,237,0.07)", border:`1px solid ${copied?"rgba(5,150,105,0.2)":"rgba(124,58,237,0.14)"}`, borderRadius:8, padding:"5px 14px", cursor:"pointer" }}>
                      {copied?"✓ Copied!":"Copy"}
                    </button>
                  )}
                </div>
                <div style={{ background:"#0f172a", borderRadius:16, padding:"22px 26px", minHeight:460, overflowX:"auto", lineHeight:1.9, fontSize:13, fontFamily:"monospace", whiteSpace:"pre", color:"#e2e8f0" }}
                  dangerouslySetInnerHTML={{ __html: codeOutput ? highlight(codeOutput) : '<span style="color:rgba(226,232,240,0.3)">// Paste JSON on the left</span>' }}
                />
                {codeOutput && <div style={{ marginTop:8, textAlign:"right", fontSize:11, color:"rgba(15,10,30,0.35)" }}>{codeOutput.length.toLocaleString()} chars</div>}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#7c3aed", textDecoration:"none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(124,58,237,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · JSON Reader</p>
      </footer>
    </div>
  );
}
