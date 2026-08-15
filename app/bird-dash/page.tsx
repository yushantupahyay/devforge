"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

const GAME_W = 400;
const GAME_H = 600;
const GROUND_H = 60;
const GRAVITY = 0.45;
const FLAP_VELOCITY = -8;
const PIPE_GAP = 150;
const PIPE_WIDTH = 60;
const PIPE_SPEED = 2.6;
const PIPE_INTERVAL = 90;
const BIRD_X = 90;
const BIRD_R = 14;
const BEST_KEY = "bird-dash-best";

type Pipe = { x: number; gapY: number; passed: boolean };
type Phase = "ready" | "playing" | "over";

export default function BirdDashPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const world = useRef({ birdY: GAME_H / 2, birdV: 0, rotation: 0, pipes: [] as Pipe[], frame: 0, score: 0 });

  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    setBest(Number(localStorage.getItem(BEST_KEY) || 0));
  }, []);

  const startGame = useCallback(() => {
    world.current = { birdY: GAME_H / 2, birdV: 0, rotation: 0, pipes: [], frame: 0, score: 0 };
    setScore(0);
    phaseRef.current = "playing";
    setPhase("playing");
  }, []);

  const flap = useCallback(() => {
    if (phaseRef.current !== "playing") startGame();
    world.current.birdV = FLAP_VELOCITY;
  }, [startGame]);

  /* keyboard controls */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  /* render + physics loop — runs continuously; physics only advances while playing */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const loop = () => {
      const w = world.current;

      if (phaseRef.current === "playing") {
        w.birdV += GRAVITY;
        w.birdY += w.birdV;
        w.rotation = Math.max(-0.5, Math.min(1.2, w.birdV / 12));
        w.frame++;

        if (w.frame % PIPE_INTERVAL === 0) {
          const margin = 60;
          const gapY = margin + Math.random() * (GAME_H - GROUND_H - margin * 2 - PIPE_GAP);
          w.pipes.push({ x: GAME_W, gapY, passed: false });
        }

        w.pipes.forEach(p => (p.x -= PIPE_SPEED));
        w.pipes = w.pipes.filter(p => p.x > -PIPE_WIDTH);

        w.pipes.forEach(p => {
          if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
            p.passed = true;
            w.score++;
            setScore(w.score);
          }
        });

        const birdTop = w.birdY - BIRD_R;
        const birdBottom = w.birdY + BIRD_R;
        let hit = birdTop < 0 || birdBottom > GAME_H - GROUND_H;
        for (const p of w.pipes) {
          const withinX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_WIDTH;
          if (withinX && !(birdTop > p.gapY && birdBottom < p.gapY + PIPE_GAP)) hit = true;
        }
        if (hit) {
          phaseRef.current = "over";
          setPhase("over");
          setBest(b => {
            const nb = Math.max(b, w.score);
            localStorage.setItem(BEST_KEY, String(nb));
            return nb;
          });
        }
      }

      /* ── render ── */
      ctx.clearRect(0, 0, GAME_W, GAME_H);
      const sky = ctx.createLinearGradient(0, 0, 0, GAME_H);
      sky.addColorStop(0, "#bfe3ff");
      sky.addColorStop(1, "#eaf6ff");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      w.pipes.forEach(p => {
        ctx.fillStyle = "#059669";
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.gapY);
        ctx.fillRect(p.x, p.gapY + PIPE_GAP, PIPE_WIDTH, GAME_H - GROUND_H - (p.gapY + PIPE_GAP));
        ctx.fillStyle = "#047857";
        ctx.fillRect(p.x - 4, p.gapY - 18, PIPE_WIDTH + 8, 18);
        ctx.fillRect(p.x - 4, p.gapY + PIPE_GAP, PIPE_WIDTH + 8, 18);
      });

      ctx.fillStyle = "#d97706";
      ctx.fillRect(0, GAME_H - GROUND_H, GAME_W, GROUND_H);
      ctx.fillStyle = "#059669";
      ctx.fillRect(0, GAME_H - GROUND_H, GAME_W, 8);

      ctx.save();
      ctx.translate(BIRD_X, w.birdY);
      ctx.rotate(w.rotation);
      ctx.fillStyle = "#7c3aed";
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.moveTo(BIRD_R - 2, -3);
      ctx.lineTo(BIRD_R + 8, 0);
      ctx.lineTo(BIRD_R - 2, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(5, -5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f0a1e";
      ctx.beginPath();
      ctx.arc(6, -5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (phaseRef.current === "playing") {
        ctx.fillStyle = "#0f0a1e";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(w.score), GAME_W / 2, 60);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div style={{ background: "#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background: "linear-gradient(135deg,#f5f3ff,#f0f4ff 50%,#fff)", padding: "36px 40px 28px" }}>
        <p className="section-label mb-2">Fun Break</p>
        <div className="section-line" style={{ margin: "0 0 12px" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize: "clamp(26px,3.5vw,48px)", color: "#0f0a1e" }}>
          Bird <span className="text-gradient-purple">Dash</span>
        </h1>
        <p style={{ color: "rgba(15,10,30,0.5)", fontSize: 15, maxWidth: 620 }}>
          Flap past the pipes without hitting them. Click, tap, or press Space / ↑ to fly.
        </p>
      </section>

      <div style={{ width: "100%", padding: "18px 40px 48px", flex: 1, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          onMouseDown={flap}
          onTouchStart={e => { e.preventDefault(); flap(); }}
          style={{ position: "relative", width: "100%", maxWidth: GAME_W, aspectRatio: `${GAME_W} / ${GAME_H}`, borderRadius: 20, overflow: "hidden", border: "1px solid rgba(124,58,237,0.18)", boxShadow: "0 20px 60px rgba(0,0,0,0.1)", cursor: "pointer", userSelect: "none" }}
        >
          <canvas ref={canvasRef} width={GAME_W} height={GAME_H} style={{ width: "100%", height: "100%", display: "block" }} />

          {phase !== "playing" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "rgba(15,10,30,0.5)", color: "#fff", textAlign: "center", padding: 24 }}>
              {phase === "ready" ? (
                <>
                  <span style={{ fontSize: 40 }}>🐦</span>
                  <h2 style={{ fontSize: 22, fontWeight: 800 }}>Bird Dash</h2>
                  <p style={{ fontSize: 13, opacity: 0.85, maxWidth: 240 }}>Click / Tap / Space to flap and dodge the pipes.</p>
                  <span className="btn btn-primary btn-sm">Tap to Start</span>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: 24, fontWeight: 800 }}>Game Over</h2>
                  <p style={{ fontSize: 15 }}>Score: <strong>{score}</strong> &nbsp;·&nbsp; Best: <strong>{best}</strong></p>
                  <span className="btn btn-primary btn-sm">Tap to Retry</span>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 20, fontSize: 12, color: "rgba(15,10,30,0.4)", fontWeight: 600 }}>
          <span>Score: {score}</span>
          <span>Best: {best}</span>
        </div>

        <div style={{ marginTop: 24 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#7c3aed", textDecoration: "none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop: "1px solid rgba(124,58,237,0.1)", fontSize: 13, color: "rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · Bird Dash</p>
      </footer>
    </div>
  );
}
