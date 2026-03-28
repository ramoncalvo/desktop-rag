// RAG App — https://github.com/ramoncalvo

import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex items-center justify-center h-screen halftone relative overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle className="text-[var(--text-muted)]" />
      </div>

      <div className="relative z-10 w-[440px]">
        {/* Brand */}
        <div className="rounded-2xl px-8 py-6 mb-6 text-center" style={{ background: "var(--accent)" }}>
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: "var(--accent-text)" }}>
            rag-app<span className="text-sm align-super ml-1 opacity-40">®</span>
          </h1>
          <p className="text-sm mt-1 opacity-60" style={{ color: "var(--accent-text)" }}>Solutions.</p>
        </div>

        {/* Login form */}
        <div className="rounded-2xl p-8" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-6 text-center" style={{ color: "var(--text)" }}>Iniciar sesion</h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition"
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition"
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>
          </div>

          <button
            onClick={onLogin}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition glow-accent hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            Entrar
          </button>

          <p className="text-center text-[11px] mt-4" style={{ color: "var(--text-muted)" }}>
            Por ahora, solo presiona "Entrar" para acceder
          </p>
        </div>

        <p className="text-center text-[10px] mt-4" style={{ color: "var(--text-muted)" }}>©2025 rag-app</p>
      </div>
    </div>
  );
}
