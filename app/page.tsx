import Link from "next/link";
import Navbar from "./components/Navbar";

const tools = [
  { emoji: "SQL", title: "SQL Generator",    desc: "Generate CREATE TABLE and dynamic CRUD stored procedures from column definitions.", tags: ["CREATE TABLE","Stored Proc","CRUD"],  accent: "#2563eb", glow: "rgba(37,99,235,0.2)",   badge: "badge-blue",    href: "/sql-generator",  cat: "Database" },
  { emoji: "{ }", title: "JSON Tools",        desc: "Format, validate, and view JSON as a sortable data grid with one click.",          tags: ["Grid","Format","Validate"],           accent: "#7c3aed", glow: "rgba(124,58,237,0.2)",  badge: "badge-purple",  href: "/json-tools",     cat: "Data"     },
  { emoji: "📄", title: "Word → PDF",         desc: "Upload a .docx file or type text and download as a print-ready PDF instantly.",   tags: ["Upload .docx","Margins","Download"],  accent: "#0284c7", glow: "rgba(2,132,199,0.2)",   badge: "badge-sky",     href: "/word-to-pdf",    cat: "Document" },
  { emoji: "📑", title: "PDF → Word",         desc: "Upload a PDF and extract all its text — copy it or download as a .txt file.",     tags: ["Extract","Copy","Download"],          accent: "#9333ea", glow: "rgba(147,51,234,0.2)",  badge: "badge-violet",  href: "/pdf-to-word",    cat: "Document" },
  { emoji: "🖼️", title: "Image Size Adjuster", desc: "Resize any image to an exact target file size in KB or MB. Supports JPEG, WebP and PNG for both reduce and increase.", tags: ["Compress","Resize","Download"], accent: "#7c3aed", glow: "rgba(124,58,237,0.2)", badge: "badge-purple", href: "/image-tools", cat: "File" },
  { emoji: "📄", title: "PDF Size Adjuster",  desc: "Compress or expand any PDF to an exact KB/MB target. Pages re-render at optimal quality for the chosen size.", tags: ["Compress","Resize","Download"], accent: "#0284c7", glow: "rgba(2,132,199,0.2)",  badge: "badge-sky",    href: "/pdf-tools",   cat: "File" },
  { emoji: "⬛", title: "QR Code Generator", desc: "Turn any text, URL, Wi-Fi credentials or phone number into a scannable QR code. Customize colour, size and error correction.", tags: ["URL","Wi-Fi","Download"], accent: "#7c3aed", glow: "rgba(124,58,237,0.2)", badge: "badge-purple", href: "/qr-tools", cat: "Generate" },
  { emoji: "🎂", title: "Age Calculator",   desc: "Enter a date of birth and get exact age, total days/weeks/hours lived, next birthday countdown, zodiac sign, generation, and life milestones.", tags: ["Birthday","Zodiac","Milestones"], accent: "#e11d48", glow: "rgba(225,29,72,0.2)", badge: "badge-rose", href: "/age-calculator", cat: "Calculator" },
  { emoji: ".*",  title: "Regex Tester",      desc: "Test regular expressions with live match highlighting and group extraction.",       tags: ["Match","Replace","Groups"],           accent: "#0891b2", glow: "rgba(8,145,178,0.2)",   badge: "badge-cyan",    href: "/regex-tester",   cat: "Pattern"  },
  { emoji: "64",  title: "Base64",            desc: "Encode and decode Base64 strings and files. Supports URL-safe alphabets.",         tags: ["Encode","Decode","URL-safe"],         accent: "#db2777", glow: "rgba(219,39,119,0.2)",  badge: "badge-pink",    href: "/base64",          cat: "Encoding" },
  { emoji: "ID",  title: "UUID Generator",    desc: "Generate cryptographically secure v4 UUIDs in bulk with one click.",              tags: ["v4","Bulk","Secure"],                 accent: "#d97706", glow: "rgba(217,119,6,0.2)",   badge: "badge-amber",   href: "/uuid-generator", cat: "Generate" },
  { emoji: "#",   title: "Hash Generator",    desc: "Generate SHA-256, SHA-512, SHA-1 hashes. Verify integrity or checksums.",         tags: ["SHA-256","SHA-512","SHA-1"],          accent: "#059669", glow: "rgba(5,150,105,0.2)",   badge: "badge-emerald", href: "/hash-generator", cat: "Security" },
  { emoji: "⏱",  title: "Timestamp",         desc: "Convert between Unix timestamps, ISO 8601, and dates across timezones.",          tags: ["Unix","ISO 8601","Timezone"],         accent: "#2563eb", glow: "rgba(37,99,235,0.2)",   badge: "badge-blue",    href: "/timestamp",      cat: "Time"     },
  { emoji: "🎨",  title: "Color Tools",       desc: "Pick colors, convert HEX/RGB/HSL and generate beautiful palettes instantly.",     tags: ["HEX","RGB","HSL"],                    accent: "#e11d48", glow: "rgba(225,29,72,0.2)",   badge: "badge-rose",    href: "/color-tools",    cat: "Design"   },
  { emoji: "Aa",  title: "Text Tools",        desc: "Word count, case converter, remove duplicates, sort lines and more.",             tags: ["Count","Case","Sort"],                accent: "#7c3aed", glow: "rgba(124,58,237,0.2)",  badge: "badge-purple",  href: "/text-tools",     cat: "Text"     },
  { emoji: "⊞",  title: "CSV Tools",         desc: "View CSV as a table, convert CSV to JSON, or convert a JSON array back to CSV.",  tags: ["Viewer","CSV→JSON","JSON→CSV"],       accent: "#0891b2", glow: "rgba(8,145,178,0.2)",   badge: "badge-cyan",    href: "/csv-tools",      cat: "Data"     },
  { emoji: "Md",  title: "Markdown Preview",  desc: "Write Markdown and see a live rendered preview. Supports code blocks, tables, lists.", tags: ["Preview","Code","Live"],         accent: "#d97706", glow: "rgba(217,119,6,0.2)",   badge: "badge-amber",   href: "/markdown",       cat: "Writing"  },
  { emoji: "🔐",  title: "JWT Decoder",       desc: "Decode and inspect JWT tokens — header, payload, expiry status and key claims.",  tags: ["Header","Payload","Expiry"],          accent: "#ea580c", glow: "rgba(234,88,12,0.2)",   badge: "badge-orange",  href: "/jwt-decoder",    cat: "Security" },
  { emoji: "🔄",  title: "Image Converter",  desc: "Convert images between JPG, PNG, WebP and BMP. Bulk convert multiple files at once with quality control.", tags: ["JPG","PNG","WebP"],  accent: "#059669", glow: "rgba(5,150,105,0.2)", badge: "badge-emerald", href: "/image-converter", cat: "File" },
];

const features = [
  { icon: "⚡", title: "Zero Latency",  desc: "All processing runs locally in your browser. No server round-trips, instant results every time.", color: "#7c3aed", fglow: "rgba(124,58,237,0.12)" },
  { icon: "🔒", title: "100% Private", desc: "Your code never leaves your device. Zero analytics, zero telemetry, zero cloud storage.",          color: "#0891b2", fglow: "rgba(8,145,178,0.12)"  },
  { icon: "🛠", title: "Zero Setup",   desc: "No accounts, no installs, no API keys. Open the URL and start working immediately.",               color: "#db2777", fglow: "rgba(219,39,119,0.12)" },
  { icon: "📱", title: "Any Device",   desc: "Fully responsive — desktop, tablet, or mobile. The same power on every screen.",                   color: "#059669", fglow: "rgba(5,150,105,0.12)"  },
];

const stats = [
  { value: "19",   label: "Developer Tools" },
  { value: "0ms",  label: "Server Latency"  },
  { value: "100%", label: "Free Forever"    },
  { value: "0",    label: "Sign-ups Needed" },
];

function CubeFaces({ size, color }: { size: number; color: string }) {
  const half = size / 2;
  const faces = [
    `translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ];
  return (
    <>
      {faces.map((t, i) => (
        <div key={i} style={{ position:"absolute", width:size, height:size, background:`${color}09`, border:`1.5px solid ${color}55`, borderRadius:size*0.12, backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", transform:t }} />
      ))}
    </>
  );
}

function hexToRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

export default function Home() {
  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Hero ───────────────────────────────────────── */}
      <section
        style={{ background:"radial-gradient(ellipse at 65% 45%, rgba(167,139,250,0.22) 0%, rgba(199,210,254,0.18) 35%, transparent 65%), #ffffff", overflow:"hidden" }}
        className="relative px-6 pt-16 pb-20"
      >
        <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 min-h-[560px]">

          {/* left */}
          <div className="flex-1 max-w-lg text-center lg:text-left">
            <div className="animate-fade-up mb-6 flex justify-center lg:justify-start">
              <span className="badge badge-purple px-4 py-2" style={{ fontSize:"11px" }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:"#7c3aed",boxShadow:"0 0 6px #7c3aed",display:"inline-block" }}/>
                v1.0 &nbsp;·&nbsp; 19 Tools &nbsp;·&nbsp; 100% Free
              </span>
            </div>
            <h1 className="animate-fade-up-1 font-black tracking-tighter leading-none mb-4" style={{ fontSize:"clamp(40px,6.5vw,82px)" }}>
              <span className="text-gradient">Need a Tool?</span><br />
              <span style={{ color:"#0f0a1e" }}>We Have It.</span>
            </h1>
            <div className="animate-fade-up-2 flex flex-wrap justify-center lg:justify-start gap-2 mb-6">
              {[
                { icon:"⚡", text:"Right Tool, Right Now" },
                { icon:"🔒", text:"Zero Sign-up Ever"    },
                { icon:"🌐", text:"Runs in Your Browser" },
                { icon:"🛠", text:"19 Tools & Growing"   },
              ].map(t => (
                <span key={t.text} style={{ fontSize:12, fontWeight:700, padding:"6px 13px", borderRadius:999,
                  background:"rgba(124,58,237,0.07)", border:"1px solid rgba(124,58,237,0.15)", color:"rgba(15,10,30,0.6)", display:"flex", alignItems:"center", gap:5 }}>
                  {t.icon} {t.text}
                </span>
              ))}
            </div>
            <p className="animate-fade-up-2 mb-8 leading-relaxed" style={{ color:"rgba(15,10,30,0.52)", fontSize:"17px", maxWidth:"460px", margin:"0 auto 2rem" }}>
              Every tool a developer needs — SQL generator, JSON viewer, image &amp; PDF utilities, QR codes, age calculator and more. All free, zero setup, no account needed.
            </p>
            <div className="animate-fade-up-3 flex flex-wrap justify-center lg:justify-start gap-4 mb-10">
              <a href="#tools" className="btn btn-primary" style={{ fontSize:"15px", padding:"14px 30px" }}>
                Find Your Tool
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
              </a>
              <a href="#features" className="btn btn-ghost" style={{ fontSize:"15px", padding:"14px 30px" }}>Why iNeedTools?</a>
            </div>
            <div className="animate-fade-up-4 flex flex-wrap justify-center lg:justify-start gap-2">
              {["SQL","JSON Grid","Regex","Base64","UUID","SHA-256","HEX/RGB","Unix TS","Text","CSV","Markdown","JWT"].map(t => (
                <span key={t} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background:"rgba(124,58,237,0.06)", border:"1px solid rgba(124,58,237,0.14)", color:"rgba(15,10,30,0.5)" }}>{t}</span>
              ))}
            </div>
          </div>

          {/* right: 3D scene */}
          <div className="flex-1 relative" style={{ minHeight:"500px", minWidth:"320px" }}>
            <div className="absolute pointer-events-none animate-orb" style={{ width:380,height:380,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%)",top:"50%",left:"50%",marginTop:-190,marginLeft:-190,filter:"blur(20px)" }} />
            <div className="animate-orbit-1 absolute pointer-events-none" style={{ width:340,height:340,borderRadius:"50%",border:"1px solid rgba(124,58,237,0.18)",top:"50%",left:"50%",marginTop:-170,marginLeft:-170 }} />
            <div className="animate-orbit-2 absolute pointer-events-none" style={{ width:460,height:460,borderRadius:"50%",border:"1px dashed rgba(8,145,178,0.15)",top:"50%",left:"50%",marginTop:-230,marginLeft:-230 }} />
            <div className="animate-float absolute" style={{ width:150,height:150,borderRadius:"50%",background:"radial-gradient(circle at 33% 30%,rgba(255,255,255,0.65) 0%,#c4b5fd 18%,#7c3aed 45%,#4338ca 70%,#1e1b4b 100%)",boxShadow:"0 0 80px rgba(124,58,237,0.5),0 0 160px rgba(124,58,237,0.15),inset -10px -10px 30px rgba(0,0,0,0.25)",top:"50%",left:"50%",marginTop:-75,marginLeft:-75,zIndex:4 }} />
            <div style={{ position:"absolute",top:"50%",left:"50%",marginTop:-90,marginLeft:-90,perspective:"900px" }}>
              <div className="animate-spin-cube-1" style={{ width:180,height:180,position:"relative",transformStyle:"preserve-3d" }}><CubeFaces size={180} color="#7c3aed" /></div>
            </div>
            <div style={{ position:"absolute",top:"8%",right:"10%",perspective:"700px" }}>
              <div className="animate-spin-cube-2" style={{ width:110,height:110,position:"relative",transformStyle:"preserve-3d" }}><CubeFaces size={110} color="#0891b2" /></div>
            </div>
            <div style={{ position:"absolute",bottom:"18%",left:"8%",perspective:"500px" }}>
              <div className="animate-spin-cube-3" style={{ width:72,height:72,position:"relative",transformStyle:"preserve-3d" }}><CubeFaces size={72} color="#db2777" /></div>
            </div>
            <div style={{ position:"absolute",top:"20%",left:"15%",perspective:"400px" }}>
              <div className="animate-spin-cube-2" style={{ width:50,height:50,position:"relative",transformStyle:"preserve-3d" }}><CubeFaces size={50} color="#d97706" /></div>
            </div>
            <div className="glass animate-float2 absolute" style={{ top:"6%",left:"4%",padding:"12px 16px",borderRadius:14,zIndex:5,boxShadow:"0 16px 40px rgba(5,150,105,0.14),0 4px 12px rgba(0,0,0,0.07)",minWidth:155 }}>
              <div style={{ display:"flex",alignItems:"center",gap:7 }}><span className="dot dot-ok"/><span style={{ fontSize:12,fontWeight:700,color:"#059669" }}>JSON Valid ✓</span></div>
              <p style={{ fontSize:11,color:"rgba(15,10,30,0.4)",marginTop:3 }}>1,248 lines · 2ms</p>
            </div>
            <div className="glass animate-float3 absolute" style={{ bottom:"8%",right:"4%",padding:"12px 16px",borderRadius:14,zIndex:5,boxShadow:"0 16px 40px rgba(8,145,178,0.14),0 4px 12px rgba(0,0,0,0.07)",minWidth:168 }}>
              <p style={{ fontSize:11,color:"rgba(15,10,30,0.42)",marginBottom:3,fontWeight:600 }}>UUID Generated</p>
              <p style={{ fontSize:10,fontFamily:"monospace",color:"#0891b2",fontWeight:700 }}>a3f2-4c91-b8e0...</p>
            </div>
            <div className="glass animate-float absolute" style={{ bottom:"30%",left:"-4%",padding:"10px 14px",borderRadius:12,zIndex:5,boxShadow:"0 16px 40px rgba(124,58,237,0.12),0 4px 12px rgba(0,0,0,0.07)" }}>
              <p style={{ fontSize:10,color:"rgba(15,10,30,0.42)",fontWeight:600 }}>SHA-256</p>
              <p style={{ fontSize:10,fontFamily:"monospace",color:"#7c3aed",fontWeight:700,marginTop:2 }}>3a7d9c2f...</p>
            </div>
            <div className="glass animate-float2 absolute" style={{ top:"55%",right:"-2%",padding:"10px 14px",borderRadius:12,zIndex:5,boxShadow:"0 16px 40px rgba(219,39,119,0.12),0 4px 12px rgba(0,0,0,0.07)" }}>
              <p style={{ fontSize:10,color:"rgba(15,10,30,0.42)",fontWeight:600 }}>Regex · 4 matches</p>
              <p style={{ fontSize:10,fontFamily:"monospace",color:"#db2777",fontWeight:700,marginTop:2 }}>/[a-z]+/gi</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tools grid ─────────────────────────────────── */}
      <section id="tools" className="max-w-7xl mx-auto px-6 pt-20 pb-16 w-full">
        <div className="text-center mb-14">
          <div className="section-line" />
          <p className="section-label mb-3">Your Arsenal</p>
          <h2 className="font-black tracking-tight" style={{ fontSize:"clamp(26px,4vw,44px)", color:"#0f0a1e" }}>
            Developer <span className="text-gradient-purple">tools</span> that actually work
          </h2>
          <p className="mt-3 max-w-md mx-auto" style={{ color:"rgba(15,10,30,0.45)", fontSize:15 }}>
            Click any card to open the tool instantly — no setup, no sign-up.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tools.map(tool => (
            <Link key={tool.href} href={tool.href} className="tool-card card-3d shimmer group" style={{ "--accent":tool.accent, "--glow":tool.glow } as React.CSSProperties}>
              <div style={{ height:2, background:`linear-gradient(90deg,transparent,${tool.accent},transparent)` }} />
              <div className="p-6 flex flex-col h-full gap-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base"
                    style={{ background:`rgba(${hexToRgb(tool.accent)},0.09)`, border:`1px solid rgba(${hexToRgb(tool.accent)},0.2)`, color:tool.accent, boxShadow:`0 0 16px rgba(${hexToRgb(tool.accent)},0.14)` }}>
                    {tool.emoji}
                  </div>
                  <span className={`badge ${tool.badge}`}>{tool.cat}</span>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <h3 className="font-bold text-base" style={{ color:"#0f0a1e" }}>{tool.title}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color:"rgba(15,10,30,0.46)" }}>{tool.desc}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tool.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ background:`rgba(${hexToRgb(tool.accent)},0.07)`, border:`1px solid rgba(${hexToRgb(tool.accent)},0.16)`, color:tool.accent }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold mt-auto" style={{ color:"rgba(15,10,30,0.32)" }}>
                  Open Tool
                  <svg className="w-4 h-4 open-arrow transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pb-20 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ borderTop:"1px solid rgba(124,58,237,0.1)", paddingTop:"2.5rem" }}>
          {stats.map(s => (
            <div key={s.label} className="glass rounded-2xl p-5 flex flex-col items-center gap-1">
              <span className="font-black text-gradient-purple" style={{ fontSize:34, lineHeight:1 }}>{s.value}</span>
              <span className="text-xs font-semibold text-center" style={{ color:"rgba(15,10,30,0.38)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ───────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 pb-24 w-full">
        <div className="text-center mb-14">
          <div className="section-line" />
          <p className="section-label mb-3">Why iNeedTools</p>
          <h2 className="font-black tracking-tight" style={{ fontSize:"clamp(26px,4vw,44px)", color:"#0f0a1e" }}>
            Built for <span className="text-gradient-cyan">developers</span>, by developers
          </h2>
          <p className="mt-3 max-w-md mx-auto" style={{ color:"rgba(15,10,30,0.45)", fontSize:15 }}>Every design decision optimised for developer speed and privacy.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(f => (
            <div key={f.title} className="feature-card" style={{ "--fglow":f.fglow } as React.CSSProperties}>
              <div className="mb-4 w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                style={{ background:`rgba(${hexToRgb(f.color)},0.09)`, border:`1px solid rgba(${hexToRgb(f.color)},0.2)`, boxShadow:`0 0 20px rgba(${hexToRgb(f.color)},0.1)` }}>
                {f.icon}
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color:"#0f0a1e" }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color:"rgba(15,10,30,0.48)" }}>{f.desc}</p>
              <div className="mt-5 h-0.5 rounded-full" style={{ background:`linear-gradient(90deg,${f.color},transparent)`, opacity:0.5 }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA strip ──────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-24 w-full">
        <div className="cta-strip">
          <div className="relative z-10">
            <p className="section-label mb-3" style={{ color:"rgba(255,255,255,0.7)" }}>Roadmap</p>
            <h2 className="font-black tracking-tight mb-4" style={{ fontSize:"clamp(24px,3.5vw,40px)", color:"#ffffff" }}>More tools shipping soon</h2>
            <p className="mb-8 max-w-md mx-auto" style={{ color:"rgba(255,255,255,0.65)", fontSize:15 }}>
              New tools ship every sprint. Bookmark iNeedTools — the toolkit grows every week.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#tools" className="btn" style={{ background:"#ffffff", color:"#7c3aed", border:"none", fontSize:14, boxShadow:"0 4px 20px rgba(0,0,0,0.15)" }}>Use Tools Now</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn" style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"#ffffff", fontSize:14 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="mt-auto py-10 text-center" style={{ borderTop:"1px solid rgba(124,58,237,0.1)", fontSize:13 }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="nav-logo-icon" style={{ width:22,height:22,fontSize:8 }}>&lt;/&gt;</span>
          <span className="font-bold text-gradient-purple" style={{ fontSize:14 }}>iNeedTools</span>
        </div>
        <p style={{ color:"rgba(15,10,30,0.38)" }}>Built for developers, by developers. All tools run 100% in your browser.</p>
        <p className="mt-1" style={{ color:"rgba(15,10,30,0.22)", fontSize:12 }}>© 2026 iNeedTools &nbsp;·&nbsp; No cookies &nbsp;·&nbsp; No tracking &nbsp;·&nbsp; Open source</p>
      </footer>
    </div>
  );
}
