"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

const SAMPLE_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJBbGljZSBTbWl0aCIsImVtYWlsIjoiYWxpY2VAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MTYyMzkwMjIsImV4cCI6MTc0Nzg2MTQyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

function base64UrlDecode(str: string): string {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, "=");
  try { return atob(padded); }
  catch { throw new Error("Invalid Base64url encoding"); }
}

interface Decoded {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  raw: { header: string; payload: string; signature: string };
}

function decodeJWT(token: string): Decoded {
  const parts = token.trim().split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT — must have exactly 3 parts separated by dots");
  const headerJson  = base64UrlDecode(parts[0]);
  const payloadJson = base64UrlDecode(parts[1]);
  return {
    header:    JSON.parse(headerJson),
    payload:   JSON.parse(payloadJson),
    signature: parts[2],
    raw:       { header: parts[0], payload: parts[1], signature: parts[2] },
  };
}

function formatTs(unix: number) {
  try { return new Date(unix * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC"; }
  catch { return String(unix); }
}

function JsonBlock({ data, accent }: { data: Record<string,unknown>; accent: string }) {
  return (
    <div style={{ background:"#0f172a", borderRadius:12, padding:"16px 20px", fontFamily:"monospace", fontSize:12.5, lineHeight:1.9, overflowX:"auto" }}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <span style={{ color:"#f472b6" }}>"{k}"</span>
          <span style={{ color:"#94a3b8" }}>:</span>
          <span style={{ color: typeof v === "number" ? "#fb923c" : typeof v === "boolean" ? "#60a5fa" : v === null ? "#94a3b8" : "#86efac" }}>
            {JSON.stringify(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function JwtDecoder() {
  const [token, setToken] = useState(SAMPLE_JWT);
  const [copied, setCopied] = useState<string|null>(null);

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /**/ }
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  const { decoded, error } = useMemo(() => {
    if (!token.trim()) return { decoded: null, error: "" };
    try { return { decoded: decodeJWT(token), error: "" }; }
    catch (e) { return { decoded: null, error: String(e).replace("Error: ", "") }; }
  }, [token]);

  const now = Math.floor(Date.now() / 1000);
  const exp  = decoded?.payload?.exp as number | undefined;
  const iat  = decoded?.payload?.iat as number | undefined;
  const isExpired = exp !== undefined && exp < now;
  const timeLeft  = exp !== undefined && exp >= now ? exp - now : null;
  const formatTimeLeft = (s: number) => {
    if (s > 86400) return `${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h`;
    if (s > 3600)  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
    if (s > 60)    return `${Math.floor(s/60)}m ${s%60}s`;
    return `${s}s`;
  };

  const IMPORTANT_CLAIMS: Record<string,string> = { sub:"Subject", iss:"Issuer", aud:"Audience", exp:"Expires", iat:"Issued At", nbf:"Not Before", jti:"JWT ID", name:"Name", email:"Email", role:"Role", roles:"Roles" };

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#fff7ed,#ffedd5 30%,#fff)", padding:"36px 40px 28px" }}>
        <p className="section-label mb-2" style={{ color:"#ea580c" }}>Security Tool</p>
        <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#ea580c,#c2410c)" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(26px,3.5vw,48px)", color:"#0f0a1e" }}>
          JWT <span style={{ background:"linear-gradient(135deg,#ea580c,#c2410c)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Decoder</span>
        </h1>
        <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15, maxWidth:580 }}>
          Decode and inspect JSON Web Tokens instantly. See the header, payload claims, and expiry status — no secrets sent anywhere.
        </p>
      </section>

      <div style={{ width:"100%", padding:"18px 40px 48px", flex:1, boxSizing:"border-box" }}>

        {/* token input */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase" }}>JWT Token</label>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setToken(SAMPLE_JWT)} style={{ fontSize:11, fontWeight:600, color:"#ea580c", background:"rgba(234,88,12,0.07)", border:"1px solid rgba(234,88,12,0.18)", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Sample</button>
              <button onClick={() => setToken("")} style={{ fontSize:11, fontWeight:600, color:"#e11d48", background:"rgba(225,29,72,0.06)", border:"1px solid rgba(225,29,72,0.15)", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Clear</button>
            </div>
          </div>
          <textarea
            className="field field-mono"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Paste your JWT token here…"
            style={{ minHeight:100, borderRadius:12, fontSize:12.5, resize:"vertical", width:"100%", wordBreak:"break-all" }}
          />
          {error && <div style={{ marginTop:8, padding:"10px 14px", borderRadius:10, background:"rgba(225,29,72,0.06)", border:"1px solid rgba(225,29,72,0.18)", fontSize:12, color:"#e11d48", fontFamily:"monospace" }}>✕ {error}</div>}
        </div>

        {decoded && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* status bar */}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <div style={{ padding:"10px 18px", borderRadius:12, background: isExpired?"rgba(225,29,72,0.07)":"rgba(5,150,105,0.07)", border:`1px solid ${isExpired?"rgba(225,29,72,0.2)":"rgba(5,150,105,0.2)"}`, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:8,height:8,borderRadius:"50%",background:isExpired?"#e11d48":"#059669",boxShadow:isExpired?"0 0 6px rgba(225,29,72,0.5)":"0 0 6px rgba(5,150,105,0.5)" }} />
                <span style={{ fontSize:13, fontWeight:700, color:isExpired?"#e11d48":"#059669" }}>{isExpired?"Token Expired":"Token Valid"}</span>
              </div>
              {exp !== undefined && <div style={{ padding:"10px 18px", borderRadius:12, background:"rgba(234,88,12,0.07)", border:"1px solid rgba(234,88,12,0.15)", fontSize:13, fontWeight:600, color:"#ea580c" }}>
                {isExpired ? `Expired: ${formatTs(exp)}` : `Expires in: ${timeLeft ? formatTimeLeft(timeLeft) : "—"}`}
              </div>}
              {iat !== undefined && <div style={{ padding:"10px 18px", borderRadius:12, background:"rgba(37,99,235,0.06)", border:"1px solid rgba(37,99,235,0.15)", fontSize:13, fontWeight:600, color:"#2563eb" }}>
                Issued: {formatTs(iat)}
              </div>}
              <div style={{ padding:"10px 18px", borderRadius:12, background:"rgba(124,58,237,0.07)", border:"1px solid rgba(124,58,237,0.15)", fontSize:13, fontWeight:600, color:"#7c3aed" }}>
                Algo: {decoded.header.alg as string ?? "—"}
              </div>
            </div>

            {/* claims highlight */}
            {Object.keys(IMPORTANT_CLAIMS).some(k => decoded.payload[k] !== undefined) && (
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>Key Claims</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {Object.entries(IMPORTANT_CLAIMS).filter(([k]) => decoded.payload[k] !== undefined).map(([k, label]) => {
                    const val = decoded.payload[k];
                    const display = (k === "exp" || k === "iat" || k === "nbf") ? formatTs(val as number) : String(val);
                    return (
                      <div key={k} style={{ padding:"8px 14px", borderRadius:10, background:"rgba(234,88,12,0.05)", border:"1px solid rgba(234,88,12,0.15)" }}>
                        <div style={{ fontSize:10, fontWeight:700, color:"rgba(15,10,30,0.4)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
                        <div style={{ fontFamily:"monospace", fontSize:12, color:"#0f0a1e", fontWeight:600, marginTop:2, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{display}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* three-section decoded view */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
              {[
                { title:"Header",    data:decoded.header,  color:"#ea580c", raw:decoded.raw.header },
                { title:"Payload",   data:decoded.payload, color:"#7c3aed", raw:decoded.raw.payload },
                { title:"Signature", data:null,            color:"#0891b2", raw:decoded.raw.signature },
              ].map(({ title, data, color, raw }) => (
                <div key={title}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:12, fontWeight:700, color, textTransform:"uppercase", letterSpacing:"0.06em" }}>{title}</span>
                    <button onClick={() => copy(data ? JSON.stringify(data, null, 2) : raw, title)} style={{ fontSize:10, fontWeight:600, color:copied===title?"#059669":color, background:copied===title?"rgba(5,150,105,0.07)":`${color}11`, border:`1px solid ${copied===title?"rgba(5,150,105,0.2)":color}33`, borderRadius:5, padding:"3px 8px", cursor:"pointer" }}>
                      {copied===title?"✓ Copied":"Copy"}
                    </button>
                  </div>
                  {data ? (
                    <JsonBlock data={data} accent={color} />
                  ) : (
                    <div style={{ background:"#0f172a", borderRadius:12, padding:"16px 20px", fontFamily:"monospace", fontSize:11, lineHeight:1.8, color:"#94a3b8", wordBreak:"break-all" }}>
                      <div style={{ color:"#64748b", fontSize:10, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>Base64url encoded</div>
                      {raw}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!decoded && !error && !token.trim() && (
          <div style={{ background:"#fff7ed", border:"1px dashed rgba(234,88,12,0.2)", borderRadius:16, minHeight:300, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"rgba(15,10,30,0.3)", fontSize:14, fontWeight:600 }}>
            <span style={{ fontSize:44 }}>🔐</span>
            Paste a JWT token above to decode it
            <span style={{ fontSize:12, fontWeight:400, maxWidth:320, textAlign:"center", lineHeight:1.6 }}>Supports any JWT — the token is decoded locally in your browser, never sent to any server</span>
          </div>
        )}

        <div style={{ marginTop:40 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#ea580c", textDecoration:"none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(234,88,12,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · JWT Decoder</p>
      </footer>
    </div>
  );
}
