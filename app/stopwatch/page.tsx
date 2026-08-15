"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

type Lap = { n: number; splitMs: number; totalMs: number };

const STORAGE_KEY = "stopwatch-state-v1";

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

function formatElapsed(ms: number) {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

export default function StopwatchPage() {
  const [accumulated, setAccumulated] = useState(0);
  const [running, setRunning]         = useState(false);
  const [startEpoch, setStartEpoch]   = useState<number | null>(null);
  const [laps, setLaps]               = useState<Lap[]>([]);
  const [, setTick]                   = useState(0);
  const [copied, setCopied]           = useState(false);

  const loadedRef = useRef(false);
  const rafRef     = useRef<number | null>(null);

  /* restore persisted state on mount (client-only — avoids SSR/hydration mismatch) */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setAccumulated(s.accumulated ?? 0);
        setRunning(!!s.running);
        setStartEpoch(s.startEpoch ?? null);
        setLaps(s.laps ?? []);
      }
    } catch { /* ignore */ }
    loadedRef.current = true;
  }, []);

  /* persist on every change — guarded so it can't fire before the initial load runs */
  useEffect(() => {
    if (!loadedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accumulated, running, startEpoch, laps }));
  }, [accumulated, running, startEpoch, laps]);

  /* tick the display forward while running */
  useEffect(() => {
    if (!running) return;
    const loop = () => { setTick(t => t + 1); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const elapsedMs = accumulated + (running && startEpoch ? Date.now() - startEpoch : 0);

  const start = useCallback(() => { setRunning(true); setStartEpoch(Date.now()); }, []);
  const pause = useCallback(() => {
    setAccumulated(a => a + (startEpoch ? Date.now() - startEpoch : 0));
    setRunning(false);
    setStartEpoch(null);
  }, [startEpoch]);
  const reset = useCallback(() => {
    setAccumulated(0); setRunning(false); setStartEpoch(null); setLaps([]);
  }, []);
  const lap = useCallback(() => {
    const total = accumulated + (startEpoch ? Date.now() - startEpoch : 0);
    setLaps(ls => {
      const prevTotal = ls.length ? ls[ls.length - 1].totalMs : 0;
      return [...ls, { n: ls.length + 1, splitMs: total - prevTotal, totalMs: total }];
    });
  }, [accumulated, startEpoch]);

  /* keyboard shortcuts: Space start/pause, L lap, R reset */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); running ? pause() : start(); }
      else if (e.key === "l" || e.key === "L") { if (running) lap(); }
      else if (e.key === "r" || e.key === "R") { if (!running) reset(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, start, pause, lap, reset]);

  const copyLaps = async () => {
    const text = laps.map(l => `Lap ${l.n}\t+${formatElapsed(l.splitMs)}\t${formatElapsed(l.totalMs)}`).join("\n");
    try { await navigator.clipboard.writeText(text || "No laps recorded"); } catch { /* ignore */ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const fastest = laps.length > 1 ? Math.min(...laps.map(l => l.splitMs)) : null;
  const slowest = laps.length > 1 ? Math.max(...laps.map(l => l.splitMs)) : null;

  const idle = !running && elapsedMs === 0;

  return (
    <div style={{ background: "#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background: "linear-gradient(135deg,#f5f3ff,#f0f4ff 50%,#fff)", padding: "36px 40px 28px" }}>
        <p className="section-label mb-2">Time Tool</p>
        <div className="section-line" style={{ margin: "0 0 12px" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize: "clamp(26px,3.5vw,48px)", color: "#0f0a1e" }}>
          Stop<span className="text-gradient-purple">watch</span>
        </h1>
        <p style={{ color: "rgba(15,10,30,0.5)", fontSize: 15, maxWidth: 620 }}>
          Start, pause, lap, and reset — with persistent state, keyboard shortcuts, and split-time analysis.
        </p>
      </section>

      <div style={{ width: "100%", padding: "18px 40px 48px", flex: 1, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* ── display ── */}
        <div className="glass" style={{ borderRadius: 24, padding: "44px 56px", textAlign: "center", minWidth: 320 }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "clamp(40px,6vw,64px)", fontWeight: 800, color: "#0f0a1e", letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" }}>
            {formatElapsed(elapsedMs)}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, fontWeight:600, color: running ? "#059669" : "rgba(15,10,30,0.35)", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <span className={running ? "dot dot-ok" : "dot dot-idle"} />
            {running ? "Running" : elapsedMs > 0 ? "Paused" : "Ready"}
          </div>
        </div>

        {/* ── controls ── */}
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {idle && (
            <button onClick={start} className="btn btn-primary">▶ Start</button>
          )}
          {running && (
            <>
              <button onClick={lap} className="btn btn-ghost">🏁 Lap</button>
              <button onClick={pause} className="btn btn-primary">⏸ Pause</button>
            </>
          )}
          {!running && !idle && (
            <>
              <button onClick={start} className="btn btn-primary">▶ Resume</button>
              <button onClick={reset} className="btn btn-ghost">↺ Reset</button>
            </>
          )}
        </div>

        <p style={{ marginTop: 14, fontSize: 11.5, color: "rgba(15,10,30,0.35)", fontWeight: 600 }}>
          <kbd style={{ padding:"1px 6px", borderRadius:5, background:"rgba(0,0,0,0.06)", fontFamily:"monospace" }}>Space</kbd> start/pause &nbsp;·&nbsp;
          <kbd style={{ padding:"1px 6px", borderRadius:5, background:"rgba(0,0,0,0.06)", fontFamily:"monospace" }}>L</kbd> lap &nbsp;·&nbsp;
          <kbd style={{ padding:"1px 6px", borderRadius:5, background:"rgba(0,0,0,0.06)", fontFamily:"monospace" }}>R</kbd> reset &nbsp;·&nbsp; keeps running even if you refresh the page
        </p>

        {/* ── laps ── */}
        {laps.length > 0 && (
          <div style={{ width: "100%", maxWidth: 480, marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(15,10,30,0.4)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                {laps.length} Lap{laps.length !== 1 ? "s" : ""}
              </span>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={copyLaps} className="copy-btn">{copied ? "✓ Copied!" : "Copy"}</button>
                <button onClick={() => setLaps([])} className="copy-btn" style={{ color:"#e11d48", background:"rgba(225,29,72,0.06)", borderColor:"rgba(225,29,72,0.18)" }}>Clear</button>
              </div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(124,58,237,0.14)", overflow: "hidden" }}>
              {[...laps].reverse().map(l => (
                <div key={l.n} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 16px", fontSize: 13, fontFamily: "monospace",
                  borderBottom: "1px solid rgba(0,0,0,0.04)",
                  background: l.splitMs === fastest ? "rgba(5,150,105,0.06)" : l.splitMs === slowest ? "rgba(225,29,72,0.05)" : l.n % 2 === 0 ? "rgba(124,58,237,0.02)" : "#fff",
                }}>
                  <span style={{ color: "rgba(15,10,30,0.4)", fontWeight: 700 }}>Lap {l.n}</span>
                  <span style={{ color: l.splitMs === fastest ? "#059669" : l.splitMs === slowest ? "#e11d48" : "#0f0a1e", fontWeight: 700 }}>
                    +{formatElapsed(l.splitMs)}
                  </span>
                  <span style={{ color: "rgba(15,10,30,0.45)" }}>{formatElapsed(l.totalMs)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#7c3aed", textDecoration: "none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop: "1px solid rgba(124,58,237,0.1)", fontSize: 13, color: "rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · Stopwatch</p>
      </footer>
    </div>
  );
}
