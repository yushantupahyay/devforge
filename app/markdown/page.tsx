"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

const SAMPLE = `# Hello, iNeedTools! 👋

Welcome to the **Markdown Preview** tool. Edit this text on the left and see the live rendered output on the right.

## Features

- **Bold text** and *italic text*
- \`inline code\` highlighting
- [Clickable links](https://iNeedTools.dev)
- Ordered and unordered lists
- Code blocks with syntax hints
- Blockquotes and horizontal rules

## Code Example

\`\`\`js
const greet = (name) => {
  return \`Hello, \${name}!\`;
};
console.log(greet("iNeedTools"));
\`\`\`

## Why Markdown?

> Markdown is a lightweight markup language for creating formatted text using a plain-text editor. It's used everywhere — GitHub, Notion, documentation, README files.

### Ordered List

1. Write your content in plain text
2. Use simple symbols for formatting
3. Preview renders instantly

---

Made with ❤️ by **iNeedTools**
`;

function escHtml(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(escHtml(lines[i]));
        i++;
      }
      out.push(`<pre style="background:#0f172a;color:#e2e8f0;padding:16px 20px;border-radius:10px;overflow-x:auto;font-size:13px;line-height:1.8;margin:12px 0">${lang ? `<span style="font-size:10px;color:#94a3b8;font-family:monospace;display:block;margin-bottom:8px">${lang}</span>` : ""}<code style="font-family:monospace">${codeLines.join("\n")}</code></pre>`);
      i++;
      continue;
    }

    // heading
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h1) { out.push(`<h1 style="font-size:28px;font-weight:900;color:#0f0a1e;margin:20px 0 8px;line-height:1.2">${inline(h1[1])}</h1>`); i++; continue; }
    if (h2) { out.push(`<h2 style="font-size:20px;font-weight:800;color:#0f0a1e;margin:18px 0 6px;line-height:1.3">${inline(h2[1])}</h2>`); i++; continue; }
    if (h3) { out.push(`<h3 style="font-size:16px;font-weight:700;color:#0f0a1e;margin:14px 0 4px">${inline(h3[1])}</h3>`); i++; continue; }

    // blockquote
    if (line.startsWith("> ")) {
      out.push(`<blockquote style="border-left:3px solid #7c3aed;margin:10px 0;padding:8px 16px;background:rgba(124,58,237,0.04);border-radius:0 8px 8px 0;color:rgba(15,10,30,0.65);font-style:italic">${inline(line.slice(2))}</blockquote>`);
      i++; continue;
    }

    // horizontal rule
    if (/^---+$/.test(line.trim())) {
      out.push(`<hr style="border:none;border-top:1px solid rgba(124,58,237,0.18);margin:16px 0"/>`);
      i++; continue;
    }

    // unordered list
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(`<li style="margin:4px 0;color:#0f0a1e">${inline(lines[i].replace(/^[-*] /, ""))}</li>`);
        i++;
      }
      out.push(`<ul style="padding-left:22px;margin:8px 0">${items.join("")}</ul>`);
      continue;
    }

    // ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(`<li style="margin:4px 0;color:#0f0a1e">${inline(lines[i].replace(/^\d+\. /, ""))}</li>`);
        i++;
      }
      out.push(`<ol style="padding-left:22px;margin:8px 0">${items.join("")}</ol>`);
      continue;
    }

    // blank line
    if (!line.trim()) { out.push(`<div style="height:8px"></div>`); i++; continue; }

    // paragraph
    out.push(`<p style="margin:6px 0;line-height:1.7;color:#0f0a1e">${inline(line)}</p>`);
    i++;
  }

  return out.join("\n");
}

function inline(s: string): string {
  // escape first for safety
  let r = escHtml(s);
  // bold+italic
  r = r.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  // bold
  r = r.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // italic
  r = r.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // inline code
  r = r.replace(/`([^`]+)`/g, `<code style="background:rgba(124,58,237,0.1);color:#6d28d9;padding:1px 6px;border-radius:4px;font-family:monospace;font-size:0.9em">$1</code>`);
  // links
  r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" style="color:#7c3aed;text-decoration:underline">$1</a>`);
  return r;
}

export default function MarkdownPreview() {
  const [md, setMd] = useState(SAMPLE);
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => renderMarkdown(md), [md]);

  const stats = useMemo(() => {
    const words = md.trim() ? md.trim().split(/\s+/).length : 0;
    const chars = md.length;
    const lines = md.split("\n").length;
    return { words, chars, lines };
  }, [md]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /**/ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#fefce8,#fef9c3 30%,#fff)", padding:"36px 40px 28px" }}>
        <p className="section-label mb-2" style={{ color:"#d97706" }}>Writing Tool</p>
        <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#d97706,#b45309)" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(26px,3.5vw,48px)", color:"#0f0a1e" }}>
          Markdown <span style={{ background:"linear-gradient(135deg,#d97706,#b45309)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Preview</span>
        </h1>
        <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15, maxWidth:580 }}>
          Write Markdown on the left and see a live rendered preview on the right. Supports headings, bold, italic, code blocks, lists and more.
        </p>
      </section>

      <div style={{ width:"100%", padding:"18px 40px 48px", flex:1, boxSizing:"border-box" }}>

        {/* stats + actions bar */}
        <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
          {[["Words", stats.words], ["Chars", stats.chars], ["Lines", stats.lines]].map(([k,v]) => (
            <div key={k as string} style={{ padding:"6px 13px", borderRadius:8, background:"rgba(217,119,6,0.07)", border:"1px solid rgba(217,119,6,0.15)" }}>
              <span style={{ fontWeight:900, fontSize:15, color:"#d97706" }}>{v}</span>
              <span style={{ fontSize:11, fontWeight:600, color:"rgba(15,10,30,0.4)", marginLeft:5 }}>{k}</span>
            </div>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button onClick={() => copy(html)} style={{ padding:"7px 14px", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", background:copied?"rgba(5,150,105,0.07)":"rgba(124,58,237,0.07)", color:copied?"#059669":"#7c3aed", border:`1px solid ${copied?"rgba(5,150,105,0.2)":"rgba(124,58,237,0.14)"}` }}>
              {copied?"✓ Copied HTML!":"Copy HTML"}
            </button>
            <button onClick={() => copy(md)} style={{ padding:"7px 14px", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", background:"rgba(217,119,6,0.07)", color:"#d97706", border:"1px solid rgba(217,119,6,0.2)" }}>
              Copy Markdown
            </button>
            <button onClick={() => setMd("")} style={{ padding:"7px 14px", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", background:"rgba(225,29,72,0.06)", color:"#e11d48", border:"1px solid rgba(225,29,72,0.15)" }}>
              Clear
            </button>
          </div>
        </div>

        {/* split editor */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"start" }}>
          {/* left: editor */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Markdown Source</label>
            <textarea
              className="field field-mono"
              value={md}
              onChange={e => setMd(e.target.value)}
              placeholder="Type your Markdown here…"
              style={{ minHeight:540, borderRadius:14, fontSize:13, resize:"vertical", width:"100%", lineHeight:1.7 }}
            />
          </div>

          {/* right: preview */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Rendered Preview</label>
            <div
              style={{ minHeight:540, padding:"24px 28px", borderRadius:14, border:"1px solid rgba(217,119,6,0.18)", background:"#fffdf0", overflowY:"auto", lineHeight:1.7, fontSize:14 }}
              dangerouslySetInnerHTML={{ __html: html || '<p style="color:rgba(15,10,30,0.3);font-style:italic">Start typing Markdown on the left…</p>' }}
            />
          </div>
        </div>

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#d97706", textDecoration:"none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(217,119,6,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · Markdown Preview</p>
      </footer>
    </div>
  );
}
