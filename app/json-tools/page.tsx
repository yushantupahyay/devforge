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

/* coerce an edited string back to the original value's type */
function coerceValue(raw: string, original: unknown): unknown {
  if (typeof original === "number") { const n = Number(raw); return raw.trim() !== "" && !isNaN(n) ? n : original; }
  if (typeof original === "boolean") return raw === "true";
  if (original === null || original === undefined) return raw === "" ? original : raw;
  return raw;
}

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
function ArrOfObjTable({ arr, noMargin, onEdit }: { arr: Record<string,unknown>[]; noMargin?: boolean; onEdit?: (rowIdx: number, col: string, value: unknown) => void }) {
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
              {cols.map(c => (
                <td key={c} style={{ padding:"7px 14px" }}>
                  {onEdit ? (
                    <EditableCell value={row[c]} onCommit={v => onEdit(i, c, v)} />
                  ) : (
                    <ExpandableCell value={row[c]} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {onEdit && (
        <div style={{ padding:"6px 14px", borderTop:"1px solid rgba(124,58,237,0.08)", fontSize:10.5, color:"rgba(15,10,30,0.35)", fontWeight:600 }}>
          double-click a cell to edit · click <strong style={{ color:"#7c3aed" }}>+</strong> chips to expand nested values
        </div>
      )}
    </div>
  );
}

/* ── ExpandableCell: cell that can expand nested data — edits bubble up via onChange ── */
function ExpandableCell({ value, onChange }: { value: unknown; onChange?: (v: unknown) => void }) {
  const [expanded, setExpanded] = useState(false);

  /* primitives — plain render */
  if (typeof value !== "object" || value === null) return <Cell value={value} />;

  const valIsArr = Array.isArray(value);

  /* empty */
  if (valIsArr && (value as unknown[]).length === 0)
    return <span style={{ color:"#94a3b8", fontSize:12 }}>[ ]</span>;
  if (!valIsArr && Object.keys(value as object).length === 0)
    return <span style={{ color:"#94a3b8", fontSize:12 }}>{"{}"}</span>;

  /* plain array of primitives — editable inline as a comma-separated list, no expand needed */
  if (valIsArr && (value as unknown[]).every(v => typeof v !== "object" || v === null))
    return <EditablePrimitiveArrayCell value={value as unknown[]} onChange={onChange} />;

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
            <ArrOfObjTable
              arr={value as Record<string,unknown>[]}
              noMargin
              onEdit={onChange ? (rowIdx, col, v) => {
                const newArr = (value as Record<string,unknown>[]).map((r, i) => i === rowIdx ? { ...r, [col]: v } : r);
                onChange(newArr);
              } : undefined}
            />
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
            <TreeExplorer
              data={value}
              onEdit={onChange ? (path, v) => onChange(setAtPath(value, path, v)) : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ── EditablePrimitiveArrayCell: array of strings/numbers/bools, edited as a comma-separated list ── */
function EditablePrimitiveArrayCell({ value, onChange }: { value: unknown[]; onChange?: (v: unknown[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editing]);

  const display = value.map(v => String(v ?? "null")).join(", ");
  if (!onChange) return <span style={{ color:"#0891b2", fontSize:12 }}>{display}</span>;

  const startEdit = () => { setDraft(value.map(v => String(v ?? "")).join(", ")); setEditing(true); };
  const commit = () => {
    setEditing(false);
    const allNumbers = value.length > 0 && value.every(v => typeof v === "number");
    const parts = draft.split(",").map(s => s.trim()).filter(s => s !== "");
    onChange(allNumbers ? parts.map(Number) : parts);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="comma-separated values"
        style={{ width:"100%", minWidth:200, boxSizing:"border-box", fontSize:12, fontFamily:"inherit", padding:"4px 7px", borderRadius:6, border:"1px solid #7c3aed", outline:"none", background:"#fff", color:"#0f0a1e" }}
      />
    );
  }

  return (
    <span onDoubleClick={startEdit} title="Double-click to edit (comma-separated)" style={{ color:"#0891b2", fontSize:12, cursor:"text" }}>
      {display}
    </span>
  );
}

/* ── EditableCell: primitive cell that turns into an input on double-click ── */
function EditableCell({ value, onCommit }: { value: unknown; onCommit: (v: unknown) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editing]);

  if (typeof value === "object" && value !== null) return <ExpandableCell value={value} onChange={onCommit} />;

  const startEdit = () => { setDraft(value === null || value === undefined ? "" : String(value)); setEditing(true); };
  const commit = () => { setEditing(false); onCommit(coerceValue(draft, value)); };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") setEditing(false);
        }}
        style={{ width:"100%", minWidth:200, boxSizing:"border-box", fontSize:13, fontFamily:"inherit", padding:"5px 8px", borderRadius:6, border:"1px solid #7c3aed", outline:"none", background:"#fff", color:"#0f0a1e" }}
      />
    );
  }

  return (
    <div onDoubleClick={startEdit} title="Double-click to edit" style={{ cursor:"text" }}>
      <Cell value={value} />
    </div>
  );
}

/* ── TreeBody: recursive rows ───────────────────────── */
interface TBProps {
  data: unknown; path: string; depth: number;
  expanded: Set<string>; toggle: (p: string) => void;
  onEdit?: (path: string, value: unknown) => void;
}
function TreeBody({ data, path, depth, expanded, toggle, onEdit }: TBProps) {
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
                ) : onEdit ? (
                  <EditableCell value={val} onCommit={v => onEdit(fp, v)} />
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
                <TreeBody data={val} path={fp} depth={depth+1} expanded={expanded} toggle={toggle} onEdit={onEdit} />
              )
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/* ── TreeExplorer: full wrapper ─────────────────────── */
function TreeExplorer({ data, onEdit }: { data: unknown; onEdit?: (path: string, value: unknown) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = useCallback((p: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  }, []);
  const thS: React.CSSProperties = { padding:"11px 16px", textAlign:"left", fontWeight:700, fontSize:11, letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(15,10,30,0.45)", borderBottom:"1px solid rgba(124,58,237,0.14)", whiteSpace:"nowrap", position:"sticky", top:0, zIndex:2, background:"rgba(248,245,255,0.98)", backdropFilter:"blur(6px)" };
  return (
    <div style={{ overflow:"auto", maxHeight:"70vh", borderRadius:16, border:"1px solid rgba(124,58,237,0.14)" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr>
            <th style={{ ...thS, color:"#7c3aed", minWidth:180 }}>Key</th>
            <th style={thS}>Value</th>
          </tr>
        </thead>
        <tbody>
          <TreeBody data={data} path="" depth={0} expanded={expanded} toggle={toggle} onEdit={onEdit} />
        </tbody>
      </table>
    </div>
  );
}

/* set a value at a dot-path (array segments are 1-based) inside a cloned copy of root */
function setAtPath(root: unknown, path: string, value: unknown): unknown {
  const clone = JSON.parse(JSON.stringify(root));
  const parts = path.split(".");
  let cur: any = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    cur = Array.isArray(cur) ? cur[Number(key) - 1] : cur[key];
  }
  const last = parts[parts.length - 1];
  if (Array.isArray(cur)) cur[Number(last) - 1] = value;
  else cur[last] = value;
  return clone;
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
  const [hiddenCols, setHiddenCols]   = useState<Set<string>>(new Set());
  const [colsMenuOpen, setColsMenuOpen] = useState(false);
  const containerRef  = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const colsMenuRef   = useRef<HTMLDivElement>(null);

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

  /* close the column-visibility menu on outside click */
  useEffect(() => {
    if (!colsMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (colsMenuRef.current && !colsMenuRef.current.contains(e.target as Node)) setColsMenuOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [colsMenuOpen]);

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

  /* reset hidden-column selection whenever the actual set of columns changes
     (new JSON pasted) — but not on every edit/sort of the same columns */
  const colsSignature = cols.join("|");
  useEffect(() => { setHiddenCols(new Set()); }, [colsSignature]);

  const visibleCols = useMemo(() => cols.filter(c => !hiddenCols.has(c)), [cols, hiddenCols]);
  const toggleCol = useCallback((c: string) => {
    setHiddenCols(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });
  }, []);

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

  /* edit a single cell in the grid — writes the change back into the JSON text */
  const updateCell = useCallback((row: Record<string,unknown>, col: string, value: unknown) => {
    if (!rootIsGrid) return;
    const arr = parsed as Record<string,unknown>[];
    const newArr = arr.map(r => (r === row ? { ...r, [col]: value } : r));
    setInput(JSON.stringify(newArr, null, 2));
  }, [parsed, rootIsGrid]);

  /* export the current grid (visible cols, filtered/sorted rows) as an Excel-openable CSV */
  const exportToExcel = useCallback(() => {
    const escapeCsv = (v: unknown) => {
      const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = "﻿" + [visibleCols, ...rows.map(row => visibleCols.map(c => row[c]))]
      .map(line => line.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "json-export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rows, visibleCols]);

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
    position:"sticky", top:0, zIndex:2, background:"rgba(248,245,255,0.98)", backdropFilter:"blur(6px)",
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
                <span style={{ fontSize:11, fontWeight:700, padding:"5px 11px", borderRadius:7, background:"rgba(8,145,178,0.07)", border:"1px solid rgba(8,145,178,0.12)", color:"#0891b2" }}>{visibleCols.length}/{cols.length} cols</span>
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
                    {/* edit hint */}
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10, fontSize:12, fontWeight:600, color:"#7c3aed" }}>
                      💡 Double-click any cell to edit it — including values inside expanded <strong>+</strong> chips.
                    </div>
                    {/* filter bar */}
                    <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
                      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search / filter rows…" style={{ flex:1, minWidth:180, padding:"9px 14px", borderRadius:10, border:"1px solid rgba(124,58,237,0.18)", fontSize:13, background:"#fafbff", color:"#0f0a1e", outline:"none" }} />
                      {sortCol && (
                        <span style={{ fontSize:12, fontWeight:600, padding:"7px 14px", borderRadius:9, background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.15)", color:"#7c3aed", display:"flex", alignItems:"center", gap:6 }}>
                          Sort: {sortCol} {sortDir==="asc"?"↑":"↓"}
                          <button onClick={() => { setSortCol(null); setSortDir("asc"); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#e11d48", fontWeight:900, fontSize:15, lineHeight:1 }}>×</button>
                        </span>
                      )}
                      {/* export to Excel */}
                      <button onClick={exportToExcel} disabled={rows.length === 0} style={{ fontSize:12, fontWeight:700, padding:"8px 14px", borderRadius:9, cursor:rows.length===0?"not-allowed":"pointer", background:"rgba(5,150,105,0.08)", color:"#059669", border:"1px solid rgba(5,150,105,0.2)", opacity:rows.length===0?0.5:1, display:"flex", alignItems:"center", gap:6 }}>
                        ⬇ Export to Excel
                      </button>
                      {/* column visibility picker */}
                      <div ref={colsMenuRef} style={{ position:"relative" }}>
                        <button onClick={() => setColsMenuOpen(o => !o)} style={{ fontSize:12, fontWeight:700, padding:"8px 14px", borderRadius:9, cursor:"pointer", background:colsMenuOpen?"rgba(124,58,237,0.14)":"rgba(124,58,237,0.07)", color:"#7c3aed", border:"1px solid rgba(124,58,237,0.2)", display:"flex", alignItems:"center", gap:6 }}>
                          ⚙ Columns ({visibleCols.length}/{cols.length})
                        </button>
                        {colsMenuOpen && (
                          <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:20, background:"#fff", border:"1px solid rgba(124,58,237,0.18)", borderRadius:12, boxShadow:"0 12px 32px rgba(15,10,30,0.16)", padding:10, minWidth:200, maxHeight:320, overflowY:"auto" }}>
                            <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                              <button onClick={() => setHiddenCols(new Set())} style={{ flex:1, fontSize:11, fontWeight:700, padding:"5px 8px", borderRadius:6, cursor:"pointer", background:"rgba(5,150,105,0.08)", color:"#059669", border:"1px solid rgba(5,150,105,0.18)" }}>Show all</button>
                              <button onClick={() => setHiddenCols(new Set(cols))} style={{ flex:1, fontSize:11, fontWeight:700, padding:"5px 8px", borderRadius:6, cursor:"pointer", background:"rgba(225,29,72,0.06)", color:"#e11d48", border:"1px solid rgba(225,29,72,0.15)" }}>Hide all</button>
                            </div>
                            {cols.map(c => (
                              <label key={c} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 4px", fontSize:12.5, color:"#0f0a1e", cursor:"pointer" }}>
                                <input type="checkbox" checked={!hiddenCols.has(c)} onChange={() => toggleCol(c)} />
                                {c}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* flat grid table — its own scroll box, header frozen to the top of it */}
                    <div style={{ overflow:"auto", maxHeight:"70vh", borderRadius:16, border:"1px solid rgba(124,58,237,0.14)" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                        <thead>
                          <tr>
                            <th style={{ ...thS, textAlign:"center", width:48, color:"rgba(15,10,30,0.3)" }}>#</th>
                            {visibleCols.map(c => (
                              <th key={c} onClick={() => handleSort(c)} style={{ ...thS, cursor:"pointer", userSelect:"none", color:sortCol===c?"#7c3aed":"rgba(15,10,30,0.5)", background:sortCol===c?"rgba(124,58,237,0.06)":"rgba(248,245,255,0.98)" }}>
                                {c} {sortCol===c?(sortDir==="asc"?"↑":"↓"):<span style={{ opacity:0.25 }}>↕</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={i} style={{ borderBottom:"1px solid rgba(0,0,0,0.042)", background:i%2===0?"#ffffff":"rgba(124,58,237,0.016)" }}>
                              <td style={{ padding:"10px 14px", textAlign:"center", color:"rgba(15,10,30,0.25)", fontWeight:600, fontSize:11, verticalAlign:"top" }}>{i+1}</td>
                              {visibleCols.map(c => (
                                <td key={c} style={{ padding:"10px 16px", verticalAlign:"top" }}>
                                  <EditableCell value={row[c]} onCommit={v => updateCell(row, c, v)} />
                                </td>
                              ))}
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr><td colSpan={visibleCols.length+1} style={{ padding:"40px", textAlign:"center", color:"rgba(15,10,30,0.3)", fontSize:14 }}>No rows match the filter</td></tr>
                          )}
                        </tbody>
                      </table>
                      <div style={{ padding:"8px 16px", borderTop:"1px solid rgba(124,58,237,0.08)", fontSize:11, color:"rgba(15,10,30,0.35)", fontWeight:600 }}>
                        {rows.length} of {(parsed as unknown[]).length} rows · {visibleCols.length}/{cols.length} columns · double-click a cell to edit · click <strong style={{ color:"#7c3aed" }}>+</strong> chips to expand nested values
                      </div>
                    </div>
                  </>
                ) : parsed !== null ? (
                  <TreeExplorer data={parsed} onEdit={(path, value) => setInput(JSON.stringify(setAtPath(parsed, path, value), null, 2))} />
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
