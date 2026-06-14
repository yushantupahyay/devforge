"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

function pad(n: number) { return String(n).padStart(2,"0"); }

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function toISO(d: Date) { return d.toISOString(); }

function localFromUnix(unix: number) {
  try { return formatDate(new Date(unix * 1000)); } catch { return "Invalid"; }
}

export default function TimestampPage() {
  const [now, setNow] = useState(0);
  const [unixInput, setUnixInput]   = useState("");
  const [dateInput, setDateInput]   = useState("");
  const [copied, setCopied]         = useState<string|null>(null);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /**/ }
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  };

  const parsedUnix = parseInt(unixInput) || 0;
  const unixDate   = unixInput ? new Date(parsedUnix * 1000) : null;
  const unixValid  = unixDate && !isNaN(unixDate.getTime());

  const dateAsUnix = dateInput ? Math.floor(new Date(dateInput).getTime() / 1000) : null;
  const dateValid  = dateAsUnix !== null && !isNaN(dateAsUnix);

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)} style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${copied===id?"rgba(5,150,105,0.25)":"rgba(37,99,235,0.2)"}`, background:copied===id?"rgba(5,150,105,0.07)":"rgba(37,99,235,0.07)", color:copied===id?"#059669":"#1d4ed8", fontSize:11, fontWeight:700, cursor:"pointer" }}>
      {copied===id?"✓":"Copy"}
    </button>
  );

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#eff6ff,#dbeafe 30%,#fff)", padding:"40px 24px 32px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <p className="section-label mb-2" style={{ color:"#2563eb" }}>Time Tool</p>
          <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#2563eb,#0891b2)" }} />
          <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(28px,4vw,46px)", color:"#0f0a1e" }}>
            Timestamp <span style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Converter</span>
          </h1>
          <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15 }}>Convert between Unix timestamps, ISO 8601, and human-readable dates instantly.</p>
        </div>
      </section>

      <div style={{ maxWidth:900, margin:"24px auto 48px", padding:"0 24px", width:"100%" }}>

        {/* live clock */}
        <div style={{ background:"linear-gradient(135deg,#eff6ff,#dbeafe)", border:"1px solid rgba(37,99,235,0.18)", borderRadius:16, padding:"24px 28px", marginBottom:20 }}>
          <p style={{ fontSize:12, fontWeight:700, color:"rgba(37,99,235,0.7)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Current Unix Timestamp</p>
          <div style={{ display:"flex", alignItems:"baseline", gap:14, flexWrap:"wrap" }}>
            <span style={{ fontFamily:"monospace", fontSize:40, fontWeight:900, color:"#1d4ed8", letterSpacing:"0.05em" }}>{now}</span>
            <div style={{ display:"flex", gap:8 }}>
              <CopyBtn text={String(now)} id="now-unix" />
              <CopyBtn text={new Date(now*1000).toISOString()} id="now-iso" />
            </div>
          </div>
          <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:16 }}>
            <span style={{ fontSize:13, color:"rgba(15,10,30,0.5)" }}>Local: <strong style={{ color:"#0f0a1e" }}>{now ? localFromUnix(now) : "—"}</strong></span>
            <span style={{ fontSize:13, color:"rgba(15,10,30,0.5)" }}>ISO 8601: <strong style={{ color:"#0f0a1e", fontFamily:"monospace", fontSize:12 }}>{now ? new Date(now*1000).toISOString() : "—"}</strong></span>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* unix → date */}
          <div style={{ background:"#ffffff", border:"1px solid rgba(37,99,235,0.14)", borderRadius:14, padding:"20px 22px" }}>
            <h3 style={{ fontWeight:700, fontSize:15, color:"#0f0a1e", marginBottom:14 }}>Unix → Human Date</h3>
            <input className="field field-mono" type="number" value={unixInput} onChange={e => setUnixInput(e.target.value)} placeholder={String(now)} style={{ borderRadius:10, marginBottom:12, fontSize:14 }} />
            {unixInput && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {unixValid ? (
                  <>
                    {[
                      ["Local",      localFromUnix(parsedUnix), "local"],
                      ["ISO 8601",   toISO(new Date(parsedUnix*1000)), "iso"],
                      ["UTC",        new Date(parsedUnix*1000).toUTCString(), "utc"],
                    ].map(([label, val, id]) => (
                      <div key={id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"rgba(37,99,235,0.04)", borderRadius:9, gap:10 }}>
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
                          <div style={{ fontFamily:"monospace", fontSize:12, color:"#0f0a1e", marginTop:2 }}>{val}</div>
                        </div>
                        <CopyBtn text={val} id={id} />
                      </div>
                    ))}
                  </>
                ) : <div style={{ fontSize:13, color:"#e11d48" }}>Invalid Unix timestamp</div>}
              </div>
            )}
          </div>

          {/* date → unix */}
          <div style={{ background:"#ffffff", border:"1px solid rgba(37,99,235,0.14)", borderRadius:14, padding:"20px 22px" }}>
            <h3 style={{ fontWeight:700, fontSize:15, color:"#0f0a1e", marginBottom:14 }}>Date → Unix Timestamp</h3>
            <input className="field" type="datetime-local" value={dateInput} onChange={e => setDateInput(e.target.value)} style={{ borderRadius:10, marginBottom:12 }} />
            {dateInput && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {dateValid ? (
                  <>
                    {[
                      ["Unix (seconds)", String(dateAsUnix), "d-unix"],
                      ["Unix (ms)", String(dateAsUnix! * 1000), "d-ms"],
                    ].map(([label, val, id]) => (
                      <div key={id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"rgba(37,99,235,0.04)", borderRadius:9, gap:10 }}>
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
                          <div style={{ fontFamily:"monospace", fontSize:13, color:"#1d4ed8", fontWeight:700, marginTop:2 }}>{val}</div>
                        </div>
                        <CopyBtn text={val} id={id} />
                      </div>
                    ))}
                    <div style={{ padding:"8px 12px", background:"rgba(37,99,235,0.04)", borderRadius:9, fontSize:12, color:"rgba(15,10,30,0.5)" }}>
                      ISO: <span style={{ fontFamily:"monospace", color:"#0f0a1e" }}>{new Date(dateAsUnix!*1000).toISOString()}</span>
                    </div>
                  </>
                ) : <div style={{ fontSize:13, color:"#e11d48" }}>Invalid date</div>}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#2563eb", textDecoration:"none" }}>← Back to DevForge</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(37,99,235,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 DevForge · Timestamp Converter</p>
      </footer>
    </div>
  );
}
