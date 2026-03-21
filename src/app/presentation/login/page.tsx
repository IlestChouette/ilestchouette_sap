"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { authenticate } from "../actions";

export default function PresentationLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Mouse parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;

      if (cardRef.current) {
        cardRef.current.style.transform = `rotateY(${dx * 8}deg) rotateX(${-dy * 8}deg) translateZ(0)`;
      }
      if (bgRef.current) {
        bgRef.current.style.transform = `translate(${dx * 20}px, ${dy * 20}px) scale(1.08)`;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await authenticate(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
      background: "#0F0F0F",
      perspective: "1000px",
    }}>

      {/* Animated background */}
      <div ref={bgRef} style={{
        position: "absolute", inset: "-10%",
        transition: "transform 0.15s ease-out",
        zIndex: 0,
      }}>
        {/* Gradient blobs */}
        <div style={{
          position: "absolute", width: "60vw", height: "60vw",
          borderRadius: "50%", top: "-20%", left: "-10%",
          background: "radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "pulse 4s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: "50vw", height: "50vw",
          borderRadius: "50%", bottom: "-10%", right: "-5%",
          background: "radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "pulse 6s ease-in-out infinite reverse",
        }} />
        {/* Grid pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(249,115,22,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* Glass card */}
      <div ref={cardRef} style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: 440,
        margin: "0 24px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 28,
        padding: "48px 40px",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
        transition: "transform 0.15s ease-out",
        transformStyle: "preserve-3d",
      }}>

        {/* Owl glow */}
        <div style={{
          position: "absolute", top: -40, left: "50%",
          transform: "translateX(-50%)",
          width: 80, height: 80,
          background: "radial-gradient(circle, rgba(249,115,22,0.6) 0%, transparent 70%)",
          filter: "blur(20px)",
          borderRadius: "50%",
        }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            fontSize: 52, marginBottom: 12,
            filter: "drop-shadow(0 0 20px rgba(249,115,22,0.8))",
            animation: "float 3s ease-in-out infinite",
            display: "inline-block",
          }}>🦉</div>
          <h1 style={{
            margin: "0 0 6px",
            fontSize: 24, fontWeight: 800,
            color: "#fff",
            letterSpacing: -0.5,
          }}>Il est chouette</h1>
          <p style={{
            margin: 0, fontSize: 13,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "system-ui, sans-serif",
          }}>Document confidentiel — Accès restreint</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>
              Email
            </label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue=""
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 15,
                color: "#fff",
                outline: "none",
                fontFamily: "system-ui, sans-serif",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(249,115,22,0.6)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>
              Mot de passe
            </label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 15,
                color: "#fff",
                outline: "none",
                fontFamily: "system-ui, sans-serif",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(249,115,22,0.6)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10, padding: "10px 14px",
              fontSize: 13, color: "#FCA5A5",
              fontFamily: "system-ui, sans-serif",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: 8,
              background: isPending
                ? "rgba(249,115,22,0.5)"
                : "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "16px",
              fontSize: 15,
              fontWeight: 700,
              cursor: isPending ? "not-allowed" : "pointer",
              fontFamily: "system-ui, sans-serif",
              boxShadow: isPending ? "none" : "0 8px 24px rgba(249,115,22,0.4)",
              transition: "all 0.2s",
              letterSpacing: 0.3,
            }}
          >
            {isPending ? "Connexion…" : "Accéder au document →"}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: "center", marginTop: 28, marginBottom: 0,
          fontSize: 12, color: "rgba(255,255,255,0.2)",
          fontFamily: "system-ui, sans-serif",
        }}>
          © 2025 Il est chouette SASU · Nice, France
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        input::placeholder { color: rgba(255,255,255,0.2); }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
