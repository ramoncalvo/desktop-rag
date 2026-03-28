// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import ThemeToggle from "./ThemeToggle";

const MODELS = ["llama3.1:8b", "llama3.2:3b", "mistral:7b", "gemma2:9b", "qwen2.5:7b"];

export default function SetupScreen({ onReady }: { onReady: (model: string) => void }) {
  const [status, setStatus] = useState("Verificando Ollama...");
  const [detail, setDetail] = useState("");
  const [model, setModel] = useState("llama3.1:8b");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => { checkOllama(); }, []);

  async function checkOllama() {
    try {
      const s = await api.ollama.status();
      if (!s.installed) { setStatus("Ollama no esta instalado"); setDetail("Instala Ollama desde https://ollama.com"); }
      else if (s.running) { setStatus("Ollama esta corriendo"); if (s.models.length) setDetail(`Modelos locales: ${s.models.join(", ")}`); }
      else { setStatus("Ollama instalado pero no esta corriendo"); setDetail("Presiona 'Iniciar' para arrancar Ollama"); }
    } catch { setStatus("Error conectando al backend"); }
    setLoading(false);
  }

  async function handleStart() {
    setWorking(true);
    try {
      const s = await api.ollama.status();
      if (!s.running) { setStatus("Iniciando Ollama..."); await api.ollama.start(); }
      setStatus(`Preparando modelo ${model}...`);
      setDetail("Esto puede tardar unos minutos la primera vez");
      await api.ollama.pull(model);
      setStatus(`Modelo ${model} listo`);
      setTimeout(() => onReady(model), 500);
    } catch (e: any) { setStatus(`Error: ${e.message}`); setWorking(false); }
  }

  return (
    <div className="flex items-center justify-center h-screen halftone relative overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle className="text-[var(--text-muted)]" />
      </div>
      <div className="relative z-10 w-[520px]">
        <div className="rounded-2xl px-8 py-6 mb-6 text-center" style={{ background: "var(--accent)" }}>
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: "var(--accent-text)" }}>
            rag-app<span className="text-sm align-super ml-1 opacity-40">®</span>
          </h1>
          <p className="text-sm mt-1 opacity-60" style={{ color: "var(--accent-text)" }}>Solutions.</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <p className="text-sm mb-4 text-center" style={{ color: "var(--text)" }}>{status}</p>
          <div className="w-full h-1 rounded-full mb-6 overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
            {(loading || working) && <div className="h-full w-full sweep-loading rounded-full" />}
          </div>
          <div className="flex items-center justify-center gap-4 mb-6">
            <label className="text-sm" style={{ color: "var(--text-muted)" }}>Modelo:</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={working}
              className="rounded-lg px-4 py-2.5 text-sm focus:outline-none transition disabled:opacity-40"
              style={{ background: "var(--bg-tertiary)", color: "var(--text)", border: "1px solid var(--border)" }}>
              {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex justify-center">
            <button onClick={handleStart} disabled={loading || working}
              className="px-8 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40 glow-accent hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
              {working ? "Preparando..." : "Iniciar"}
            </button>
          </div>
          {detail && <p className="text-xs mt-5 text-center" style={{ color: "var(--text-muted)" }}>{detail}</p>}
        </div>
      </div>
    </div>
  );
}
